process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.NODE_ENV = 'production';

jest.mock('../../../config/prisma', () => ({
  calificacion: {
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

describe('Calificaciones integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ id: 10, rol: 'DOCENTE' });
  });

  test('GET /calificaciones/:id returns one record', async () => {
    prisma.calificacion.findUnique.mockResolvedValue({
      id: 12,
      matriculaId: 5,
      materiaAnualId: 3,
      periodoId: 4,
      nota: 8,
      fecha: null,
      matricula: { id: 5, alumno: { id: 11 }, curso: { id: 6, anio: { id: 1 } } },
      materiaAnual: { id: 3, materia: { id: 2 }, anio: { id: 1 } },
      periodo: { id: 4, anio: { id: 1 } }
    });

    const response = await request(app)
      .get('/calificaciones/12')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(12);
  });
});
