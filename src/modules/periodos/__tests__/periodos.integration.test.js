process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.NODE_ENV = 'production';

jest.mock('../../../config/prisma', () => ({
  periodo: {
    findUnique: jest.fn()
  }
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const prisma = require('../../../config/prisma');
const app = require('../../../app');

describe('Periodos integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ id: 1, rol: 'ADMIN' });
  });

  test('GET /periodos/:id returns one record', async () => {
    prisma.periodo.findUnique.mockResolvedValue({
      id: 4,
      nombre: 'Primer trimestre',
      orden: 1,
      anioId: 1,
      anio: { id: 1, anio: 2026, estado: 'BORRADOR' }
    });

    const response = await request(app)
      .get('/periodos/4')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(4);
  });
});
