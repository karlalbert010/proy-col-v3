const bcrypt = require('bcrypt');

const prisma = require('../src/config/prisma');

async function main() {
  const username = process.env.SEED_USERNAME || 'admin';
  const plainPassword = process.env.SEED_PASSWORD || 'admin123';
  const rol = process.env.SEED_ROL || 'ADMIN';

  const password = await bcrypt.hash(plainPassword, 10);

  await prisma.usuario.upsert({
    where: { username },
    update: {
      password,
      rol,
      activo: true
    },
    create: {
      username,
      password,
      rol,
      activo: true
    }
  });

  console.log(`Auth seed ready. user=${username} role=${rol}`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
