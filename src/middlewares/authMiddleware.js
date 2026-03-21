const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token no provisto o formato invalido.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload || typeof payload.id !== 'number' || typeof payload.rol !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Token invalido.'
      });
    }

    req.user = {
      id: payload.id,
      rol: payload.rol
    };

    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalido o expirado.'
    });
  }
}

module.exports = authMiddleware;
