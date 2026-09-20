import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaff } from '../middleware/roles.js';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

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

function isExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > SESSION_TIMEOUT_MS;
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
              in: ['pending', 'signed'],
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
       */
      for (const session of existingSessions) {
        if (isExpired(session.createdAt)) {
          await prisma.signingSession.update({
            where: { id: session.id },
            data: {
              status: 'expired',
            },
          });
        }
      }

      /*
       * Check again for an active session.
       *
       * A signed session is still active because staff
       * has not confirmed it yet.
       */
      const activeSession = existingSessions.find(
        (session) => !isExpired(session.createdAt)
      );

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

      if (
        session.status === 'pending' &&
        isExpired(session.createdAt)
      ) {
        await prisma.signingSession.update({
          where: { id },
          data: {
            status: 'expired',
          },
        });

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
      await prisma.tabletLock.deleteMany({
        where: { id: LOCK_ID },
      });

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
    async (_request, reply) => {
      const session =
        await prisma.signingSession.findFirst({
          where: {
            status: {
              in: ['pending', 'signed'],
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
       */
      if (isExpired(session.createdAt)) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'expired',
          },
        });

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

      if (isExpired(session.createdAt)) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'expired',
          },
        });

        return reply.status(400).send({
          error: 'Signing session has expired',
        });
      }

      await prisma.signingSession.update({
        where: {
          id: session.id,
        },
        data: {
          liveSignature: signature,
        },
      });

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

      if (isExpired(session.createdAt)) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'expired',
          },
        });

        return reply.status(400).send({
          error: 'Signing session has expired',
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

      /*
       * Mark the session as signed.
       *
       * It remains active until staff confirms it.
       */
      const now = new Date();

      await prisma.signingSession.update({
        where: {
          id: session.id,
        },
        data: {
          liveSignature: signature,
          status: 'signed',
          consentAt: now,
          completedAt: now,
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
          await prisma.signingSession.update({
            where: { id: session.id },
            data: { status: 'confirmed' },
          });

          return { status: 'confirmed' };
        }
      }

      return {
        status: session.status,
      };
    }
  );
}
