process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

jest.mock('../../../config/prisma', () => ({
  usuario: {
    findUnique: jest.fn()
  }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../../config/prisma');
const app = require('../../../app');

describe('Auth integration - POST /auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 when username or password is missing', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'admin' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'username y password son obligatorios.'
    });
  });

  test('returns 401 when user does not exist', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Credenciales invalidas.'
    });
  });

  test('returns 401 when user is inactive', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      rol: 'ADMIN',
      activo: false
    });

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(response.status).toBe(401);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test('returns 401 when password is invalid', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      rol: 'ADMIN',
      activo: true
    });
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Credenciales invalidas.'
    });
  });

  test('returns 200 and token when credentials are valid', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 10,
      username: 'docente1',
      password: 'hashed_password',
      rol: 'DOCENTE',
      activo: true
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('jwt_test_token');

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'docente1', password: 'valid_password' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        token: 'jwt_test_token'
      }
    });

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 10, rol: 'DOCENTE' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
  });
});
