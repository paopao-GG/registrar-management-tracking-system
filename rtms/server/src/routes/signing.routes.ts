import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaff } from '../middleware/roles.js';

// The ceiling on a signing, counted from when staff started it.
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

/*
 * How long the signing device may go silent before the session it was
 * working on counts as abandoned. The device refreshes the lock at least
 * every LOCK_TOUCH_MS while the sign page polls, so silence this long means
 * nobody is holding it: an internet drop looks exactly like this from here.
 *
 * Deliberately longer than LOCK_STALE_MS, so a brief drop hands the lock on
 * without also throwing away a signature the claimant is midway through.
 */
const SESSION_ABANDONED_MS = 2 * 60 * 1000;

// A tablet that stops polling for this long loses its lock.
const LOCK_STALE_MS = 60 * 1000;
// Throttle lock heartbeat writes; the tablet polls every 500 ms.
const LOCK_TOUCH_MS = 10 * 1000;
// A staff member must have used the app within this window.
const STAFF_ACTIVE_MS = 3 * 60 * 1000;
const STAFF_CHECK_CACHE_MS = 10 * 1000;

const LOCK_ID = 'tablet';
const DEVICE_HEADER = 'x-tablet-device';
const MAX_SESSION_TRANSACTIONS = 200;

const OPEN_STATUSES = ['pending', 'signed'];

declare module 'fastify' {
  interface FastifyRequest {
    // When the signing device was last seen, read before this request's own
    // heartbeat overwrote it. Set by requireTabletDevice.
    tabletLastSeenAt?: Date;
  }
}

function isExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > SESSION_TIMEOUT_MS;
}

/*
 * Whether the signing device went quiet for long enough that whatever it
 * had open is no longer being attended. Reading the lock's heartbeat keeps
 * this to the state RTAMS already records, so no column had to be added.
 *
 * With no lock at all, from a reset or a device that never claimed one, the
 * session has never had a device checking in: measure from its start.
 */
function isAbandoned(
  session: { createdAt: Date },
  lock: { lastSeenAt: Date } | null
) {
  const lastSeen = lock
    ? lock.lastSeenAt.getTime()
    : session.createdAt.getTime();

  return Date.now() - lastSeen > SESSION_ABANDONED_MS;
}

/*
 * The same question asked by a tablet endpoint, where the preHandler has
 * already stamped the lock and the pre-heartbeat reading is the only
 * honest one left.
 */
function deviceWasAway(request: FastifyRequest) {
  const lastSeen = request.tabletLastSeenAt;
  return !!lastSeen && Date.now() - lastSeen.getTime() > SESSION_ABANDONED_MS;
}

/*
 * Ends a session that is no longer live, guarded on the status it was read
 * at so a signing someone confirmed in the meantime is left alone. Returns
 * whether this call is the one that ended it.
 */
async function endSession(
  session: { id: string; status: string },
  status: 'expired' | 'cancelled' | 'confirmed'
) {
  const ended = await prisma.signingSession.updateMany({
    where: { id: session.id, status: session.status },
    data: { status },
  });

  return ended.count > 0;
}

/*
 * Ends what a departed device left open, called when the lock is claimed
 * after going quiet. A signing whose device has been gone that long has
 * nobody attending it, and leaving it open drops the next device straight
 * into a stranger's signature screen.
 *
 * `lock` is the holder being replaced, or null when the slot was empty.
 * The grace period still applies either way, so a release staff started
 * moments ago survives the signing device opening the page for the first
 * time.
 */
async function endSessionsForLostDevice(lock: { lastSeenAt: Date } | null) {
  const open = await prisma.signingSession.findMany({
    where: { status: { in: OPEN_STATUSES } },
  });

  for (const session of open) {
    if (isExpired(session.createdAt) || isAbandoned(session, lock)) {
      await endSession(session, 'expired');
    }
  }
}

function getDeviceId(request: FastifyRequest) {
  const value = request.headers[DEVICE_HEADER];
  return typeof value === 'string' ? value.trim() : '';
}

let staffCheck = { at: 0, active: false };

/*
 * Whether a staff member is currently working. `lastActiveAt`
 * is stamped by their own authenticated requests (see
 * auth.service.ts) and cleared when they log out.
 *
 * Only the staff role counts: an admin cannot release documents,
 * so an admin session does not activate the tablet.
 */
async function isStaffActive() {
  const now = Date.now();

  if (now - staffCheck.at < STAFF_CHECK_CACHE_MS) {
    return staffCheck.active;
  }

  const activeStaff = await prisma.user.count({
    where: {
      role: 'staff',
      status: 'active',
      lastActiveAt: { gte: new Date(now - STAFF_ACTIVE_MS) },
    },
  });

  staffCheck = { at: now, active: activeStaff > 0 };
  return staffCheck.active;
}

/*
 * Guard for every tablet endpoint:
 * - only the device holding the lock may use it;
 * - only while a staff member is active.
 */
async function requireTabletDevice(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const deviceId = getDeviceId(request);

  const lock = await prisma.tabletLock.findUnique({
    where: { id: LOCK_ID },
  });

  if (!deviceId || !lock || lock.deviceId !== deviceId) {
    return reply.status(423).send({
      error: 'This device is not the registered signing tablet.',
      reason: 'not_claimed',
    });
  }

  /*
   * Keep the reading from before the heartbeat below. A device that has been
   * away keeps its lock, so this gap is the only way a handler can tell a
   * reconnect from a device that was here all along.
   */
  request.tabletLastSeenAt = lock.lastSeenAt;

  if (Date.now() - lock.lastSeenAt.getTime() > LOCK_TOUCH_MS) {
    await prisma.tabletLock.update({
      where: { id: LOCK_ID },
      data: { lastSeenAt: new Date() },
    });
  }

  if (!(await isStaffActive())) {
    return reply.status(503).send({
      error: 'Signing is unavailable while no staff member is active.',
      reason: 'no_active_staff',
    });
  }
}

function sessionTransactionIds(session: {
  transactionId: string;
  transactionIds: string[];
}) {
  return session.transactionIds.length > 0
    ? session.transactionIds
    : [session.transactionId];
}

export async function signingRoutes(app: FastifyInstance) {
  /*
   * STAFF:
   * Create a tablet signing session for one or more
   * transactions claimed by the same person.
   */
  app.post(
    '/api/signing/sessions',
    { preHandler: [authenticate, requireStaff] },
    async (request, reply) => {
      const body = request.body as {
        transactionId?: string;
        transactionIds?: string[];
        releasedTo?: string;
      };

      const requestedIds = Array.isArray(body.transactionIds)
        ? body.transactionIds
        : [body.transactionId];

      const transactionIds = Array.from(
        new Set(
          requestedIds
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter(Boolean)
        )
      );

      const releasedTo = body.releasedTo?.trim();

      if (transactionIds.length === 0) {
        return reply.status(400).send({
          error: 'Transaction ID is required',
        });
      }

      if (transactionIds.length > MAX_SESSION_TRANSACTIONS) {
        return reply.status(400).send({
          error: `Cannot release more than ${MAX_SESSION_TRANSACTIONS} transactions at once`,
        });
      }

      if (!releasedTo) {
        return reply.status(400).send({
          error: 'Claimant name is required',
        });
      }

      const transactions =
        await prisma.transaction.findMany({
          where: { id: { in: transactionIds } },
          select: { status: true },
        });

      if (transactions.length !== transactionIds.length) {
        return reply.status(404).send({
          error: 'Transaction not found',
        });
      }

      if (
        transactions.some(
          (t) => t.status !== 'Ready for Release'
        )
      ) {
        return reply.status(400).send({
          error:
            'All transactions must be Ready for Release before tablet signing.',
        });
      }

      /*
       * Find existing tablet sessions.
       *
       * Both "pending" and "signed" sessions are active.
       *
       * A "signed" session remains active until staff
       * confirms or cancels it.
       */
      const existingSessions =
        await prisma.signingSession.findMany({
          where: {
            status: {
              in: OPEN_STATUSES,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      /*
       * Expire old sessions. A signed one that nobody confirmed
       * expires too, so an abandoned signing does not block the
       * tablet for good. Its signature is already saved on the
       * transactions either way.
       *
       * A session whose device stopped checking in expires here as
       * well, which is what lets staff start again straight after an
       * internet drop instead of waiting out SESSION_TIMEOUT_MS. This
       * request does not touch the lock, so its heartbeat still says
       * when the device was really last seen.
       */
      const lock = await prisma.tabletLock.findUnique({
        where: { id: LOCK_ID },
      });

      const stillOpen = [];

      for (const session of existingSessions) {
        if (isExpired(session.createdAt) || isAbandoned(session, lock)) {
          await endSession(session, 'expired');
          continue;
        }

        stillOpen.push(session);
      }

      /*
       * Check again for an active session.
       *
       * A signed session is still active because staff
       * has not confirmed it yet.
       */
      const [activeSession] = stillOpen;

      if (activeSession) {
        return reply.status(409).send({
          error:
            'The tablet is currently in use. Please finish or confirm the current signing session first.',
        });
      }

      const token = crypto
        .randomBytes(32)
        .toString('hex');

      const session =
        await prisma.signingSession.create({
          data: {
            transactionId: transactionIds[0],
            transactionIds,
            token,
            releasedTo,
            status: 'pending',
          },
        });

      return reply.status(201).send({
        sessionId: session.id,
        token: session.token,
        transactionIds,
        releasedTo,
        count: transactionIds.length,
      });
    }
  );

  /*
   * STAFF:
   * Check the current signing session.
   *
   * The staff computer uses this to receive the live
   * signature and detect when the claimant has submitted it.
   */
  app.get(
    '/api/signing/sessions/:id',
    {
      preHandler: [authenticate, requireStaff],
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const session =
        await prisma.signingSession.findUnique({
          where: { id },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      /*
       * A pending session whose device has gone quiet ends here too, so
       * the release dialog stops waiting on a signature nobody is giving
       * rather than spinning until SESSION_TIMEOUT_MS.
       */
      const lock = await prisma.tabletLock.findUnique({
        where: { id: LOCK_ID },
      });

      if (
        session.status === 'pending' &&
        (isExpired(session.createdAt) || isAbandoned(session, lock))
      ) {
        await endSession(session, 'expired');

        return {
          status: 'expired',
          releasedTo: session.releasedTo,
          liveSignature: null,
          signature: null,
        };
      }

      return {
        status: session.status,
        releasedTo: session.releasedTo,
        liveSignature: session.liveSignature,
        signature:
          session.status === 'signed' ||
          session.status === 'confirmed'
            ? session.liveSignature
            : null,
      };
    }
  );

  /*
   * STAFF:
   * Cancel a signing session.
   */
  app.delete(
    '/api/signing/sessions/:id',
    {
      preHandler: [authenticate, requireStaff],
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const session =
        await prisma.signingSession.findUnique({
          where: { id },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      /*
       * A session can only be cancelled before staff
       * confirms it.
       */
      if (
        session.status === 'pending' ||
        session.status === 'signed'
      ) {
        await prisma.signingSession.update({
          where: { id },
          data: {
            status: 'cancelled',
          },
        });
      }

      return {
        message: 'Signing session cancelled',
      };
    }
  );

  /*
   * TABLET:
   * Claim the signing tablet slot for this device.
   *
   * Succeeds when no device holds the lock, when this device
   * already holds it, or when the holder stopped polling.
   */
  app.post(
    '/api/signing/tablet/claim',
    async (request, reply) => {
      const deviceId = getDeviceId(request);

      if (!deviceId || deviceId.length > 100) {
        return reply.status(400).send({
          error: 'Device ID is required',
        });
      }

      const staleBefore = new Date(Date.now() - LOCK_STALE_MS);

      /*
       * Read the lock before taking it: once the claim lands, the
       * heartbeat is this device's and no longer says whether the slot
       * had been sitting quiet.
       */
      const previous = await prisma.tabletLock.findUnique({
        where: { id: LOCK_ID },
      });

      const taken = await prisma.tabletLock.updateMany({
        where: {
          id: LOCK_ID,
          OR: [
            { deviceId },
            { lastSeenAt: { lt: staleBefore } },
          ],
        },
        data: {
          deviceId,
          lastSeenAt: new Date(),
        },
      });

      if (taken.count > 0) {
        /*
         * A lock that had gone quiet means the device holding it left
         * mid-signing. End what it had open rather than hand the next
         * device straight into a stranger's signature screen. Re-claiming
         * a lock still being refreshed is an ordinary reconnect and
         * leaves the session alone.
         */
        if (!previous || previous.lastSeenAt < staleBefore) {
          await endSessionsForLostDevice(previous);
        }

        return { claimed: true };
      }

      // No lock yet: create it, unless another device just did.
      const created = await prisma.tabletLock.createMany({
        data: {
          id: LOCK_ID,
          deviceId,
          lastSeenAt: new Date(),
        },
        skipDuplicates: true,
      });

      if (created.count > 0) {
        // Nothing was holding the slot, so nothing open belongs to a device.
        await endSessionsForLostDevice(null);

        return { claimed: true };
      }

      return reply.status(423).send({
        error: 'The signing page is already open on another device.',
        reason: 'locked',
      });
    }
  );

  /*
   * STAFF / ADMIN:
   * Release the tablet lock so another device can claim it.
   */
  app.delete(
    '/api/signing/tablet/lock',
    { preHandler: authenticate },
    async () => {
      /*
       * End the signing along with the lock, in one commit. Freeing the
       * lock alone left the session open, so the next device to claim was
       * handed straight back into the stuck signature screen this button
       * exists to clear: that is why a reset appeared not to work.
       *
       * Cancelling is safe here because a reset is a deliberate act by a
       * signed-in staff or admin, not something a device can ask for.
       */
      await prisma.$transaction([
        prisma.signingSession.updateMany({
          where: { status: { in: OPEN_STATUSES } },
          data: { status: 'cancelled' },
        }),
        prisma.tabletLock.deleteMany({
          where: { id: LOCK_ID },
        }),
      ]);

      return { message: 'Tablet lock reset' };
    }
  );

  /*
   * TABLET:
   * Find the current active signing session.
   *
   * This endpoint does not use a staff login; it is
   * restricted to the device holding the tablet lock,
   * and only while a staff member is active.
   *
   * IMPORTANT:
   * Both "pending" and "signed" sessions are returned.
   *
   * This allows the tablet to show:
   *
   * "Signature Required"
   *
   * while pending, and:
   *
   * "Signature Submitted"
   *
   * while waiting for staff confirmation.
   */
  app.get(
    '/api/signing/tablet/current',
    { preHandler: requireTabletDevice },
    async (request, reply) => {
      const session =
        await prisma.signingSession.findFirst({
          where: {
            status: {
              in: OPEN_STATUSES,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      if (!session) {
        return reply.send({
          session: null,
        });
      }

      /*
       * A signed session stays available for staff confirmation,
       * but not forever: once it expires the tablet goes back to
       * waiting instead of showing a signing nobody confirmed.
       *
       * The same goes for a device coming back from an internet drop
       * long enough that the claimant will have given up and left. The
       * lock keeps this device's name through an outage, so without the
       * gap the reconnecting page would be handed its old signing back
       * and sit there for good.
       */
      if (isExpired(session.createdAt) || deviceWasAway(request)) {
        await endSession(session, 'expired');

        return reply.send({
          session: null,
        });
      }

      const transactions =
        await prisma.transaction.findMany({
          where: {
            id: { in: sessionTransactionIds(session) },
          },
          select: { studentName: true },
        });

      if (transactions.length === 0) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'cancelled',
          },
        });

        return reply.send({
          session: null,
        });
      }

      return reply.send({
        session: {
          token: session.token,
          releasedTo: session.releasedTo,
          studentNames: Array.from(
            new Set(transactions.map((t) => t.studentName))
          ),
          count: transactions.length,
          status: session.status,
        },
      });
    }
  );

  /*
   * TABLET:
   * Send the current signature drawing to the server.
   */
  app.post(
    '/api/signing/sessions/:token/progress',
    { preHandler: requireTabletDevice },
    async (request, reply) => {
      const { token } = request.params as {
        token: string;
      };

      const body = request.body as {
        signature?: string;
      };

      const signature =
        typeof body.signature === 'string'
          ? body.signature.trim()
          : '';

      const session =
        await prisma.signingSession.findUnique({
          where: {
            token,
          },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      if (session.status !== 'pending') {
        return reply.status(400).send({
          error:
            'Signing session is no longer active',
        });
      }

      if (isExpired(session.createdAt) || deviceWasAway(request)) {
        await endSession(session, 'expired');

        return reply.status(400).send({
          error: 'Signing session has expired',
        });
      }

      /*
       * Guarded on pending, so a preview that was in flight when the
       * session ended cannot paint a stroke back onto it.
       */
      const updated = await prisma.signingSession.updateMany({
        where: {
          id: session.id,
          status: 'pending',
        },
        data: {
          liveSignature: signature,
        },
      });

      if (updated.count === 0) {
        return reply.status(409).send({
          error: 'Signing session is no longer active',
        });
      }

      return {
        success: true,
      };
    }
  );

  /*
   * TABLET:
   * Submit the final signature.
   */
  app.post(
    '/api/signing/sessions/:token/sign',
    { preHandler: requireTabletDevice },
    async (request, reply) => {
      const { token } = request.params as {
        token: string;
      };

      const body = request.body as {
        signature?: string;
        consent?: boolean;
      };

      const signature =
        typeof body.signature === 'string'
          ? body.signature.trim()
          : '';

      if (!signature) {
        return reply.status(400).send({
          error: 'Signature is required',
        });
      }

      if (body.consent !== true) {
        return reply.status(400).send({
          error:
            'Consent to signature capture under the Data Privacy Act is required.',
        });
      }

      const session =
        await prisma.signingSession.findUnique({
          where: {
            token,
          },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      if (session.status !== 'pending') {
        return reply.status(400).send({
          error:
            'Signing session is no longer active',
        });
      }

      if (isExpired(session.createdAt) || deviceWasAway(request)) {
        await endSession(session, 'expired');

        return reply.status(400).send({
          error: 'Signing session has expired',
        });
      }

      /*
       * Take the session out of pending first, guarded, so this is the one
       * request that can do it. A submission that comes back late from a
       * dropped connection finds nothing to match and is refused here,
       * rather than landing on a signing that has since been expired,
       * cancelled or replaced.
       *
       * It remains active, as "signed", until staff confirms it.
       */
      const now = new Date();

      const claimed = await prisma.signingSession.updateMany({
        where: {
          id: session.id,
          status: 'pending',
        },
        data: {
          liveSignature: signature,
          status: 'signed',
          consentAt: now,
          completedAt: now,
        },
      });

      if (claimed.count === 0) {
        return reply.status(409).send({
          error: 'Signing session is no longer active',
        });
      }

      /*
       * Save the final signature to every transaction in the
       * session.
       *
       * The transactions are NOT released yet.
       * Staff must still confirm the signature.
       */
      await prisma.transaction.updateMany({
        where: {
          id: { in: sessionTransactionIds(session) },
        },
        data: {
          signature,
        },
      });

      return {
        success: true,
        status: 'signed',
      };
    }
  );

  /*
   * TABLET:
   * Check whether staff has confirmed the signature.
   */
  app.get(
    '/api/signing/tablet/status/:token',
    { preHandler: requireTabletDevice },
    async (request, reply) => {
      const { token } = request.params as {
        token: string;
      };

      const session =
        await prisma.signingSession.findUnique({
          where: {
            token,
          },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      /*
       * Releasing the documents confirms the session. If a
       * session is still "signed" but its documents are all
       * released, the confirmation was lost: finish it here
       * so the tablet stops waiting.
       */
      if (session.status === 'signed') {
        const ids = sessionTransactionIds(session);

        const released = await prisma.transaction.count({
          where: { id: { in: ids }, status: 'Released' },
        });

        if (released === ids.length) {
          await endSession(session, 'confirmed');

          return { status: 'confirmed' };
        }
      }

      /*
       * This is the only endpoint the page polls once a signature is in,
       * so a drop that happens between submitting and staff confirming is
       * caught here. Ending the session lets the page fall back to
       * waiting instead of holding "Signature Submitted" indefinitely.
       */
      if (
        OPEN_STATUSES.includes(session.status) &&
        (isExpired(session.createdAt) || deviceWasAway(request))
      ) {
        await endSession(session, 'expired');

        return { status: 'expired' };
      }

      return {
        status: session.status,
      };
    }
  );
}
