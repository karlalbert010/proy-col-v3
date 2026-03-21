process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.NODE_ENV = 'production';

jest.mock('../../../config/prisma', () => ({
  materia: {
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

describe('Materias integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ id: 10, rol: 'DOCENTE' });
  });

  test('GET /materias/:id returns one record', async () => {
    prisma.materia.findUnique.mockResolvedValue({
      id: 2,
      codigoBase: 'MAT',
      descripcion: 'Matematica',
      activa: true
    });

    const response = await request(app)
      .get('/materias/2')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(2);
  });
});
