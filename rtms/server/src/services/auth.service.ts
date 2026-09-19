import { prisma } from '../config/db.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

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
