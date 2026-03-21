process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.NODE_ENV = 'production';

jest.mock('../../../config/prisma', () => {
  const mockPrisma = {
    logCambio: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  };

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

describe('LogCambios integration - CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ id: 1, rol: 'ADMIN' });
  });

  test('GET /log-cambios returns logs', async () => {
    prisma.logCambio.findMany.mockResolvedValue([
      { id: 1, usuario: 'user:1', tablaAfectada: 'Usuario', idRegistro: 7, tipoOperacion: 'DELETE' }
    ]);

    const response = await request(app)
      .get('/log-cambios')
      .set(authHeader('ADMIN', 1));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  test('GET /log-cambios/:id returns 404 when not found', async () => {
    prisma.logCambio.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/log-cambios/999')
      .set(authHeader('ADMIN', 1));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Log de cambio no encontrado.');
  });

  test('POST /log-cambios returns 400 for invalid operation', async () => {
    const response = await request(app)
      .post('/log-cambios')
      .set(authHeader('ADMIN', 1))
      .send({
        usuario: 'admin',
        tablaAfectada: 'Usuario',
        idRegistro: 1,
        tipoOperacion: 'UPSERT'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Operacion invalida. Use INSERT, UPDATE o DELETE.');
  });

  test('PUT /log-cambios/:id returns 404 when not found', async () => {
    prisma.logCambio.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .put('/log-cambios/50')
      .set(authHeader('ADMIN', 1))
      .send({ usuario: 'nuevo' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Log de cambio no encontrado.');
  });

  test('DELETE /log-cambios/:id deletes record', async () => {
    prisma.logCambio.findUnique.mockResolvedValue({
      id: 15,
      usuario: 'user:1',
      tablaAfectada: 'Alumno',
      idRegistro: 3,
      tipoOperacion: 'UPDATE'
    });
    prisma.logCambio.delete.mockResolvedValue({ id: 15 });

    const response = await request(app)
      .delete('/log-cambios/15')
      .set(authHeader('ADMIN', 1));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
