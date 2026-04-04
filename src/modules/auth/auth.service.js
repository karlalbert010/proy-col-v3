const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = require('../../config/prisma');

async function login({ username, password }) {
  const user = await prisma.usuario.findUnique({
    where: { username }
  });

  if (!user || !user.activo) {
    return null;
  }

  const passwordIsValid = await bcrypt.compare(password, user.password);

  if (!passwordIsValid) {
    return null;
  }

  const payload = {
    id: user.id,
    rol: user.rol
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      rol: user.rol
    }
  };
}

async function getMe(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      rol: true,
      activo: true
    }
  });

  if (!user || !user.activo) {
    return null;
  }

  return user;
}

module.exports = {
  login,
  getMe
};
