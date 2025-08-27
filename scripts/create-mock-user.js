import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.upsert({
      where: { id: 'user-1' },
      update: {},
      create: {
        id: 'user-1',
        email: 'mockuser@example.com',
        name: 'Mock User',
      },
    });
    console.log('Mock user created or updated:', user);
  } catch (e) {
    console.error('Error creating mock user:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
