const prisma = require('../../config/prisma');

const VALID_OPERACIONES = new Set(['INSERT', 'UPDATE', 'DELETE']);

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

function normalizeOperacion(value, required = true) {
  if ((value === undefined || value === null || value === '') && required) {
    throw createHttpError('El campo tipoOperacion es obligatorio.', 400);
  }

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createHttpError('El campo tipoOperacion debe ser texto.', 400);
  }

  const normalized = value.trim().toUpperCase();

  if (!VALID_OPERACIONES.has(normalized)) {
    throw createHttpError('Operacion invalida. Use INSERT, UPDATE o DELETE.', 400);
  }

  return normalized;
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(`El campo ${fieldName} debe tener formato de fecha valido.`, 400);
  }

  return parsed;
}

async function getLogCambios({ tablaAfectada, tipoOperacion, usuario }) {
  const where = {};

  if (tablaAfectada !== undefined && tablaAfectada !== null && tablaAfectada !== '') {
    where.tablaAfectada = {
      contains: String(tablaAfectada).trim()
    };
  }

  if (tipoOperacion !== undefined && tipoOperacion !== null && tipoOperacion !== '') {
    where.tipoOperacion = normalizeOperacion(tipoOperacion, true);
  }

  if (usuario !== undefined && usuario !== null && usuario !== '') {
    where.usuario = {
      contains: String(usuario).trim()
    };
  }

  return prisma.logCambio.findMany({
    where,
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }]
  });
}

async function getLogCambioById(id) {
  const logId = parsePositiveInteger(id, 'id');

  const log = await prisma.logCambio.findUnique({
    where: { id: logId }
  });

  if (!log) {
    throw createHttpError('Log de cambio no encontrado.', 404);
  }

  return log;
}

async function createLogCambio(payload) {
  const usuario = normalizeString(payload.usuario, 'usuario');
  const tablaAfectada = normalizeString(payload.tablaAfectada, 'tablaAfectada');
  const idRegistro = parsePositiveInteger(payload.idRegistro, 'idRegistro');
  const tipoOperacion = normalizeOperacion(payload.tipoOperacion, true);
  const fecha = parseOptionalDate(payload.fecha, 'fecha');

  return prisma.logCambio.create({
    data: {
      usuario,
      tablaAfectada,
      idRegistro,
      tipoOperacion,
      valorAnterior: payload.valorAnterior ?? null,
      valorNuevo: payload.valorNuevo ?? null,
      ...(fecha !== undefined ? { fecha } : {})
    }
  });
}

async function updateLogCambio({ id, payload }) {
  const logId = parsePositiveInteger(id, 'id');

  const current = await prisma.logCambio.findUnique({
    where: { id: logId }
  });

  if (!current) {
    throw createHttpError('Log de cambio no encontrado.', 404);
  }

  const data = {};

  if (payload.usuario !== undefined) {
    data.usuario = normalizeString(payload.usuario, 'usuario');
  }
  if (payload.tablaAfectada !== undefined) {
    data.tablaAfectada = normalizeString(payload.tablaAfectada, 'tablaAfectada');
  }
  if (payload.idRegistro !== undefined) {
    data.idRegistro = parsePositiveInteger(payload.idRegistro, 'idRegistro');
  }
  if (payload.tipoOperacion !== undefined) {
    data.tipoOperacion = normalizeOperacion(payload.tipoOperacion, true);
  }
  if (payload.valorAnterior !== undefined) {
    data.valorAnterior = payload.valorAnterior;
  }
  if (payload.valorNuevo !== undefined) {
    data.valorNuevo = payload.valorNuevo;
  }
  if (payload.fecha !== undefined) {
    data.fecha = parseOptionalDate(payload.fecha, 'fecha');
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  return prisma.logCambio.update({
    where: { id: logId },
    data
  });
}

async function deleteLogCambio(id) {
  const logId = parsePositiveInteger(id, 'id');

  const current = await prisma.logCambio.findUnique({
    where: { id: logId }
  });

  if (!current) {
    throw createHttpError('Log de cambio no encontrado.', 404);
  }

  return prisma.logCambio.delete({
    where: { id: logId }
  });
}

module.exports = {
  getLogCambios,
  getLogCambioById,
  createLogCambio,
  updateLogCambio,
  deleteLogCambio
};
