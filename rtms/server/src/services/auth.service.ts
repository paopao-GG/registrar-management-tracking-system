import { prisma } from '../config/db.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

// Throttle activity writes; an open dashboard polls every few seconds.
const ACTIVITY_WRITE_MS = 60 * 1000;

const lastWriteAt = new Map<string, number>();

/*
 * Marks the user as currently working, from their own requests.
 * The tablet sign page is only available while a staff member is
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
 * Ends the activity marker, so the tablet stops signing as soon
 * as the staff member logs out.
 */
export async function clearActivity(userId: string) {
  lastWriteAt.delete(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: null },
  });
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.status === 'inactive') {
    throw new Error('Account is deactivated');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  lastWriteAt.set(user.id, Date.now());

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const token = signToken({
    id: user.id,
    role: user.role,
    name: user.name,
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
