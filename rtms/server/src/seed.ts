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

  const studentCount = await prisma.student.count();
  if (studentCount === 0) {
    const sampleStudents = [
      { studentNumber: 'SEED-0001', lastName: 'Reyes', firstName: 'Ana', course: 'BSIT', yearLevel: 3 },
      { studentNumber: 'SEED-0002', lastName: 'Mendoza', firstName: 'Carlo', course: 'BSCS', yearLevel: 2 },
      { studentNumber: 'SEED-0003', lastName: 'Lopez', firstName: 'Diana', course: 'BSBA', yearLevel: 4 },
      { studentNumber: 'SEED-0004', lastName: 'Garcia', firstName: 'Eduardo', course: 'BSIT', yearLevel: 1 },
      { studentNumber: 'SEED-0005', lastName: 'Cruz', firstName: 'Fatima', course: 'BSED', yearLevel: 3 },
      { studentNumber: 'SEED-0006', lastName: 'Santos', firstName: 'Gabriel', course: 'BSCRIM', yearLevel: 2 },
      { studentNumber: 'SEED-0007', lastName: 'Flores', firstName: 'Hannah', course: 'BSA', yearLevel: 4 },
      { studentNumber: 'SEED-0008', lastName: 'Torres', firstName: 'Ivan', course: 'BSAGRI', yearLevel: 1 },
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
