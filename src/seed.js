require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@mustshare.go.th' },
    update: {},
    create: {
      id: 'USR-001',
      name: 'ผู้ดูแลระบบ',
      email: 'admin@mustshare.go.th',
      password: adminPassword,
      role: 'admin',
      status: 'Active'
    }
  });

  // Create coordinator user
  const coordPassword = await bcrypt.hash('coord1234', 10);
  await prisma.user.upsert({
    where: { email: 'coord@mustshare.go.th' },
    update: {},
    create: {
      id: 'USR-002',
      name: 'ผู้ประสานงาน',
      email: 'coord@mustshare.go.th',
      password: coordPassword,
      role: 'coordinator',
      status: 'Active'
    }
  });

  // Create regular user
  const userPassword = await bcrypt.hash('user1234', 10);
  await prisma.user.upsert({
    where: { email: 'user@mustshare.go.th' },
    update: {},
    create: {
      id: 'USR-003',
      name: 'ผู้ใช้งาน',
      email: 'user@mustshare.go.th',
      password: userPassword,
      role: 'user',
      status: 'Active'
    }
  });

  console.log('Seed complete!');
  console.log('');
  console.log('Default accounts:');
  console.log('  Admin:       admin@mustshare.go.th  / admin1234');
  console.log('  Coordinator: coord@mustshare.go.th  / coord1234');
  console.log('  User:        user@mustshare.go.th   / user1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
