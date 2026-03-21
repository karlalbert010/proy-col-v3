process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.NODE_ENV = 'production';

jest.mock('../../../config/prisma', () => {
  const mockPrisma = {
    usuario: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    logCambio: {
      create: jest.fn()
    }
  };

  mockPrisma.$transaction = jest.fn(async (fn) => fn(mockPrisma));
  return mockPrisma;
});

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const prisma = require('../../../config/prisma');
const app = require('../../../app');

function authHeader(role = 'ADMIN', id = 1) {
  jwt.verify.mockReturnValue({ id, rol: role });
  return { Authorization: 'Bearer valid_token' };
}

describe('Usuarios integration - CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ id: 1, rol: 'ADMIN' });
  });

  test('GET /usuarios returns 401 without token', async () => {
    const response = await request(app).get('/usuarios');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('GET /usuarios returns 403 for non-admin role', async () => {
    const response = await request(app)
      .get('/usuarios')
      .set(authHeader('DOCENTE', 2));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('No tiene permisos para este recurso.');
  });

  test('GET /usuarios returns list for admin', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      { id: 1, username: 'admin', password: 'hash', rol: 'ADMIN', activo: true }
    ]);

    const response = await request(app)
      .get('/usuarios')
      .set(authHeader('ADMIN', 1));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([
      { id: 1, username: 'admin', rol: 'ADMIN', activo: true }
    ]);
  });

  test('GET /usuarios/:id returns 404 when missing', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/usuarios/99')
      .set(authHeader('ADMIN', 1));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Usuario no encontrado.');
  });

  test('POST /usuarios creates user', async () => {
    prisma.usuario.create.mockResolvedValue({
      id: 10,
      username: 'docente1',
      password: 'hash',
      rol: 'DOCENTE',
      activo: true
    });

    const response = await request(app)
      .post('/usuarios')
      .set(authHeader('ADMIN', 1))
      .send({
        username: 'docente1',
        password: 'secret123',
        rol: 'DOCENTE'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      id: 10,
      username: 'docente1',
      rol: 'DOCENTE',
      activo: true
    });
  });

  test('PUT /usuarios/:id returns 400 without fields', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 5,
      username: 'admin',
      password: 'hash',
      rol: 'ADMIN',
      activo: true
    });

    const response = await request(app)
      .put('/usuarios/5')
      .set(authHeader('ADMIN', 1))
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Debe enviar al menos un campo para actualizar.');
  });

  test('DELETE /usuarios/:id deletes user and audits action', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      username: 'directivo1',
      password: 'hash',
      rol: 'DIRECTIVO',
      activo: true
    });
    prisma.usuario.delete.mockResolvedValue({ id: 7 });
    prisma.logCambio.create.mockResolvedValue({ id: 501 });

    const response = await request(app)
      .delete('/usuarios/7')
      .set(authHeader('ADMIN', 1));

    expect(response.status).toBe(200);
    expect(prisma.logCambio.create).toHaveBeenCalledTimes(1);
  });
});
