const bcrypt = require('bcrypt');

const prisma = require('../src/config/prisma');

function parseUsersFromEnv() {
  const raw = process.env.SEED_AUTH_USERS_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase();
  const allowed = new Set(['ADMIN', 'DOCENTE', 'DIRECTIVO']);
  if (!allowed.has(value)) {
    throw new Error(`Rol invalido en seed auth: ${role}`);
  }
  return value;
}

async function upsertUser(userDef) {
  const username = String(userDef.username || '').trim();
  const plainPassword = String(userDef.password || '').trim();
  const rol = normalizeRole(userDef.rol);

  if (!username || !plainPassword) {
    throw new Error('username y password son obligatorios para seed auth.');
  }

  const password = await bcrypt.hash(plainPassword, 10);

  return prisma.usuario.upsert({
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
}

async function main() {
  const defaults = [
    { username: 'admin', password: process.env.SEED_PASSWORD_ADMIN || 'admin123', rol: 'ADMIN' },
    { username: 'director', password: process.env.SEED_PASSWORD_DIRECTOR || '1234', rol: 'DIRECTIVO' },
    { username: 'profesor', password: process.env.SEED_PASSWORD_DOCENTE || '1234', rol: 'DOCENTE' }
  ];

  const users = parseUsersFromEnv() || defaults;
  const result = [];
  for (const userDef of users) {
    const user = await upsertUser(userDef);
    result.push({
      id: user.id,
      username: user.username,
      rol: user.rol
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        seeded: result.length,
        users: result
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Seed auth error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
