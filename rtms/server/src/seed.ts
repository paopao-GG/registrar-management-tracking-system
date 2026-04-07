import { PrismaClient } from '@prisma/client';
import { env } from './config/env.js';
import { hashPassword } from './utils/password.js';

const prisma = new PrismaClient();

async function seed() {
  console.log('Connected to PostgreSQL');

  // Seed admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Registrar Admin',
      username: 'admin',
      passwordHash: await hashPassword('admin123'),
      role: 'admin',
      status: 'active',
    },
  });
  console.log('Admin ready: admin / admin123');

  // Seed sample staff
  const staffAccounts = [
    { name: 'Juan Dela Cruz', username: 'staff1', password: 'staff123' },
    { name: 'Maria Santos', username: 'staff2', password: 'staff123' },
  ];

  for (const staff of staffAccounts) {
    await prisma.user.upsert({
      where: { username: staff.username },
      update: {},
      create: {
        name: staff.name,
        username: staff.username,
        passwordHash: await hashPassword(staff.password),
        role: 'staff',
        status: 'active',
      },
    });
    console.log(`Staff ready: ${staff.username} / ${staff.password}`);
  }

  // Seed sample students (surname first format)
  const studentCount = await prisma.student.count();
  if (studentCount === 0) {
    const sampleStudents = [
      { name: 'Reyes, Ana', course: 'BSIT', yearLevel: 3 },
      { name: 'Mendoza, Carlo', course: 'BSCS', yearLevel: 2 },
      { name: 'Lopez, Diana', course: 'BSBA', yearLevel: 4 },
      { name: 'Garcia, Eduardo', course: 'BSIT', yearLevel: 1 },
      { name: 'Cruz, Fatima', course: 'BSED', yearLevel: 3 },
      { name: 'Santos, Gabriel', course: 'BSCRIM', yearLevel: 2 },
      { name: 'Flores, Hannah', course: 'BSA', yearLevel: 4 },
      { name: 'Torres, Ivan', course: 'BSAGRI', yearLevel: 1 },
    ];
    await prisma.student.createMany({ data: sampleStudents });
    console.log(`Created ${sampleStudents.length} sample students`);
  } else {
    console.log('Students already exist, skipping');
  }

  await prisma.$disconnect();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
