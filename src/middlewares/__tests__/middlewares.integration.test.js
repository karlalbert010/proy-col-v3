jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const authMiddleware = require('../authMiddleware');
const roleMiddleware = require('../roleMiddleware');

describe('authMiddleware integration', () => {
  const app = express();

  app.get('/secure', authMiddleware, (req, res) => {
    return res.status(200).json({
      success: true,
      data: req.user
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when Authorization header is missing', async () => {
    const response = await request(app).get('/secure');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('returns 401 when token is invalid', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const response = await request(app)
      .get('/secure')
      .set('Authorization', 'Bearer invalid_token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token invalido o expirado.');
  });

  test('returns 401 when token payload does not include id and rol', async () => {
    jwt.verify.mockReturnValue({ sub: 1 });

    const response = await request(app)
      .get('/secure')
      .set('Authorization', 'Bearer token_without_payload');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token invalido.');
  });

  test('allows access when token is valid', async () => {
    jwt.verify.mockReturnValue({ id: 3, rol: 'ADMIN' });

    const response = await request(app)
      .get('/secure')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        id: 3,
        rol: 'ADMIN'
      }
    });
  });
});

describe('roleMiddleware integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when req.user is missing', async () => {
    const app = express();

    app.get('/admin', roleMiddleware('ADMIN'), (_req, res) => {
      return res.status(200).json({ success: true });
    });

    const response = await request(app).get('/admin');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Usuario no autenticado.');
  });

  test('returns 403 when req.user rol is invalid', async () => {
    const app = express();

    app.get(
      '/admin',
      (req, _res, next) => {
        req.user = { id: 1, rol: 'ALUMNO' };
        return next();
      },
      roleMiddleware('ADMIN'),
      (_req, res) => {
        return res.status(200).json({ success: true });
      }
    );

    const response = await request(app).get('/admin');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Rol de usuario invalido.');
  });

  test('returns 403 when rol is not allowed', async () => {
    const app = express();

    app.get(
      '/admin',
      (req, _res, next) => {
        req.user = { id: 2, rol: 'DOCENTE' };
        return next();
      },
      roleMiddleware('ADMIN'),
      (_req, res) => {
        return res.status(200).json({ success: true });
      }
    );

    const response = await request(app).get('/admin');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('No tiene permisos para este recurso.');
  });

  test('allows access when rol is authorized', async () => {
    const app = express();

    app.get(
      '/admin',
      (req, _res, next) => {
        req.user = { id: 9, rol: 'ADMIN' };
        return next();
      },
      roleMiddleware('ADMIN'),
      (_req, res) => {
        return res.status(200).json({ success: true });
      }
    );

    const response = await request(app).get('/admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
