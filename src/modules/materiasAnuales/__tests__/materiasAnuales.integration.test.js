process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.NODE_ENV = 'production';

jest.mock('../../../config/prisma', () => ({
  materiaAnual: {
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

describe('MateriasAnuales integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ id: 8, rol: 'DIRECTIVO' });
  });

  test('GET /materias-anuales/:id returns one record', async () => {
    prisma.materiaAnual.findUnique.mockResolvedValue({
      id: 3,
      materiaId: 2,
      anioId: 1,
      nombre: 'Matematica 2026',
      cargaHoraria: 4,
      materia: { id: 2 },
      anio: { id: 1, anio: 2026, estado: 'BORRADOR' }
    });

    const response = await request(app)
      .get('/materias-anuales/3')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(3);
  });
});
