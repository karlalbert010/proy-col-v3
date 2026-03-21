const bcrypt = require('bcrypt');

const prisma = require('../../config/prisma');
const auditLogger = require('../../utils/auditLogger');

const VALID_ROLES = new Set(['ADMIN', 'DOCENTE', 'DIRECTIVO']);

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(`El campo ${fieldName} debe ser un numero entero positivo.`, 400);
  }

  return parsed;
}

function normalizeString(value, fieldName, required = true) {
  if ((value === undefined || value === null || value === '') && required) {
    throw createHttpError(`El campo ${fieldName} es obligatorio.`, 400);
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createHttpError(`El campo ${fieldName} debe ser texto.`, 400);
  }

  const normalized = value.trim();

  if (required && !normalized) {
    throw createHttpError(`El campo ${fieldName} es obligatorio.`, 400);
  }

  return normalized;
}

function normalizeRol(value, required = true) {
  if ((value === undefined || value === null || value === '') && required) {
    throw createHttpError('El campo rol es obligatorio.', 400);
  }

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createHttpError('El campo rol debe ser texto.', 400);
  }

  const normalized = value.trim().toUpperCase();

  if (!VALID_ROLES.has(normalized)) {
    throw createHttpError('Rol invalido. Use ADMIN, DOCENTE o DIRECTIVO.', 400);
  }

  return normalized;
}

function toPublicUsuario(usuario) {
  if (!usuario) {
    return usuario;
  }

  return {
    id: usuario.id,
    username: usuario.username,
    rol: usuario.rol,
    activo: usuario.activo
  };
}

function toAuditUsuario(usuario) {
  if (!usuario) {
    return usuario;
  }

  return {
    id: usuario.id,
    username: usuario.username,
    rol: usuario.rol,
    activo: usuario.activo,
    password: '[HIDDEN]'
  };
}

async function getUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ id: 'desc' }]
  });

  return usuarios.map(toPublicUsuario);
}

async function getUsuarioById(id) {
  const usuarioId = parsePositiveInteger(id, 'id');

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId }
  });

  if (!usuario) {
    throw createHttpError('Usuario no encontrado.', 404);
  }

  return toPublicUsuario(usuario);
}

async function createUsuario(payload) {
  const username = normalizeString(payload.username, 'username');
  const password = normalizeString(payload.password, 'password');
  const rol = normalizeRol(payload.rol, true);
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const created = await prisma.usuario.create({
      data: {
        username,
        password: hashedPassword,
        rol,
        activo: payload.activo === undefined ? true : Boolean(payload.activo)
      }
    });

    return toPublicUsuario(created);
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('El username ya existe.', 400);
    }

    throw error;
  }
}

async function updateUsuario({ id, payload, user }) {
  const usuarioId = parsePositiveInteger(id, 'id');

  const current = await prisma.usuario.findUnique({
    where: { id: usuarioId }
  });

  if (!current) {
    throw createHttpError('Usuario no encontrado.', 404);
  }

  const data = {};

  if (payload.username !== undefined) {
    data.username = normalizeString(payload.username, 'username');
  }
  if (payload.password !== undefined) {
    const password = normalizeString(payload.password, 'password');
    data.password = await bcrypt.hash(password, 10);
  }
  if (payload.rol !== undefined) {
    data.rol = normalizeRol(payload.rol, true);
  }
  if (payload.activo !== undefined) {
    data.activo = Boolean(payload.activo);
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.usuario.update({
        where: { id: usuarioId },
        data
      });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Usuario',
        idRegistro: usuarioId,
        tipoOperacion: 'UPDATE',
        valorAnterior: toAuditUsuario(current),
        valorNuevo: toAuditUsuario(updated),
        prismaClient: tx
      });

      return toPublicUsuario(updated);
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('El username ya existe.', 400);
    }

    throw error;
  }
}

async function deleteUsuario({ id, user }) {
  const usuarioId = parsePositiveInteger(id, 'id');

  const current = await prisma.usuario.findUnique({
    where: { id: usuarioId }
  });

  if (!current) {
    throw createHttpError('Usuario no encontrado.', 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.usuario.delete({ where: { id: usuarioId } });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Usuario',
      idRegistro: usuarioId,
      tipoOperacion: 'DELETE',
      valorAnterior: toAuditUsuario(current),
      valorNuevo: null,
      prismaClient: tx
    });
  });
}

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};
