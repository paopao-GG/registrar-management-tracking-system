import { prisma } from '../config/db.js';
import { comparePassword } from '../utils/password.js';
import { randomUUID } from 'node:crypto';
import { signToken, TOKEN_TTL_MS } from '../utils/jwt.js';

// Throttle activity writes; an open dashboard polls every few seconds.
const ACTIVITY_WRITE_MS = 60 * 1000;
// A session unused for this long no longer blocks a login elsewhere.
const SESSION_IDLE_MS = 3 * 60 * 1000;

const lastWriteAt = new Map<string, number>();

/*
 * Marks the user as currently working, from their own requests.
 * The sign page is only available while a staff member is
 * active, so every authenticated request refreshes this.
 */
export function touchActivity(userId: string) {
  const now = Date.now();

  if (now - (lastWriteAt.get(userId) ?? 0) < ACTIVITY_WRITE_MS) {
    return;
  }

  lastWriteAt.set(userId, now);

  prisma.user
    .update({
      where: { id: userId },
      data: { lastActiveAt: new Date(now) },
    })
    .catch(() => {
      // Activity tracking must never fail a request; retry next time.
      lastWriteAt.delete(userId);
    });
}

/*
 * Ends the activity marker, so the sign device stops signing as soon
 * as the staff member logs out, and frees the account for another
 * device. A device whose session was already replaced leaves the
 * current one alone.
 */
export async function clearActivity(userId: string, sessionId: string | undefined) {
  // Tokens from before sessions were tracked own no session to end.
  if (!sessionId) return;

  lastWriteAt.delete(userId);

  await prisma.user.updateMany({
    where: { id: userId, sessionId },
    data: { lastActiveAt: null, sessionId: null, sessionExpiresAt: null },
  });
}

/*
 * Ends the account's session from outside, e.g. an admin signing out
 * a device that was left logged in.
 */
export async function endSession(userId: string) {
  lastWriteAt.delete(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: null, sessionId: null, sessionExpiresAt: null },
  });
}

// A refusal the login form can show as is (wrong password, deactivated).
export class LoginError extends Error {}

export class SessionInUseError extends Error {
  constructor() {
    super(
      'This account is already signed in on another device. Log out there first, or ask an admin to sign it out.'
    );
  }
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (!user) {
    throw new LoginError('Invalid credentials');
  }

  if (user.status === 'inactive') {
    throw new LoginError('Account is deactivated');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new LoginError('Invalid credentials');
  }

  /*
   * One device per account. The current session blocks a new login only
   * while it is live: its token has not expired and it was used within
   * the idle window, so a browser closed without logging out frees the
   * account after a few minutes. The check and the takeover are one
   * conditional write, so two devices logging in together cannot both win.
   */
  const now = new Date();
  const sessionId = randomUUID();

  const taken = await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [
        { sessionId: null },
        { sessionExpiresAt: null },
        { sessionExpiresAt: { lte: now } },
        { lastActiveAt: null },
        { lastActiveAt: { lt: new Date(now.getTime() - SESSION_IDLE_MS) } },
      ],
    },
    data: {
      sessionId,
      sessionExpiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
      lastActiveAt: now,
    },
  });

  if (taken.count === 0) {
    throw new SessionInUseError();
  }

  lastWriteAt.set(user.id, now.getTime());

  const token = signToken({
    id: user.id,
    role: user.role,
    name: user.name,
    sid: sessionId,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  };
}
