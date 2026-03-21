const prisma = require('../../config/prisma');
const auditLogger = require('../../utils/auditLogger');

const VALID_ESTADOS = new Set(['BORRADOR', 'ACTIVO', 'CERRADO']);

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseAnio(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 3000) {
    throw createHttpError('El campo anio debe ser un numero entero valido.', 400);
  }

  return parsed;
}

function normalizeEstado(estado, required = false) {
  if (estado === undefined || estado === null || estado === '') {
    if (required) {
      throw createHttpError('El campo estado es obligatorio.', 400);
    }

    return undefined;
  }

  if (typeof estado !== 'string') {
    throw createHttpError('El campo estado debe ser texto.', 400);
  }

  const normalized = estado.trim().toUpperCase();

  if (!VALID_ESTADOS.has(normalized)) {
    throw createHttpError('Estado invalido. Use BORRADOR, ACTIVO o CERRADO.', 400);
  }

  return normalized;
}

async function ensureNoOtherActiveAnio(excludeId = null) {
  const activeAnio = await prisma.anioLectivo.findFirst({
    where: {
      estado: 'ACTIVO',
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });

  if (activeAnio) {
    throw createHttpError('Solo puede existir un anio lectivo con estado ACTIVO.', 400);
  }
}

async function getAnios({ anio, estado }) {
  const where = {};

  if (anio !== undefined && anio !== null && anio !== '') {
    where.anio = parseAnio(anio);
  }

  if (estado !== undefined && estado !== null && estado !== '') {
    where.estado = normalizeEstado(estado, true);
  }

  const anios = await prisma.anioLectivo.findMany({
    where,
    orderBy: [{ anio: 'desc' }]
  });

  return anios;
}

async function getAnioActual() {
  const currentYear = new Date().getFullYear();

  const anioActual = await prisma.anioLectivo.findUnique({
    where: { anio: currentYear }
  });

  if (!anioActual) {
    throw createHttpError(`No existe anio lectivo para ${currentYear}.`, 404);
  }

  return anioActual;
}

async function getAnioById(id) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
  }

  const anio = await prisma.anioLectivo.findUnique({
    where: { id: parsedId }
  });

  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  return anio;
}

async function createAnio({ anio, estado }) {
  const parsedAnio = parseAnio(anio);
  const parsedEstado = normalizeEstado(estado) || 'BORRADOR';

  if (parsedEstado === 'ACTIVO') {
    await ensureNoOtherActiveAnio();
  }

  try {
    const created = await prisma.anioLectivo.create({
      data: {
        anio: parsedAnio,
        estado: parsedEstado
      }
    });

    return created;
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('Ya existe un anio lectivo con ese valor de anio.', 400);
    }

    throw error;
  }
}

async function updateAnio({ id, anio, user }) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
  }

  const parsedAnio = parseAnio(anio);

  const current = await prisma.anioLectivo.findUnique({
    where: { id: parsedId }
  });

  if (!current) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  if (current.anio === parsedAnio) {
    throw createHttpError('El anio lectivo ya tiene ese valor de anio.', 400);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const anioUpdated = await tx.anioLectivo.update({
        where: { id: parsedId },
        data: { anio: parsedAnio }
      });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'AnioLectivo',
        idRegistro: parsedId,
        tipoOperacion: 'UPDATE',
        valorAnterior: { anio: current.anio },
        valorNuevo: { anio: parsedAnio },
        prismaClient: tx
      });

      return anioUpdated;
    });

    return updated;
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('Ya existe un anio lectivo con ese valor de anio.', 400);
    }

    throw error;
  }
}

async function updateEstado({ id, estado, user }) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
  }

  const parsedEstado = normalizeEstado(estado, true);

  const anio = await prisma.anioLectivo.findUnique({
    where: { id: parsedId }
  });

  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  if (anio.estado === parsedEstado) {
    throw createHttpError('El anio lectivo ya tiene ese estado.', 400);
  }

  if (parsedEstado === 'ACTIVO') {
    await ensureNoOtherActiveAnio(parsedId);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const anioUpdated = await tx.anioLectivo.update({
      where: { id: parsedId },
      data: { estado: parsedEstado }
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'AnioLectivo',
      idRegistro: parsedId,
      tipoOperacion: 'UPDATE',
      valorAnterior: { estado: anio.estado },
      valorNuevo: { estado: parsedEstado },
      prismaClient: tx
    });

    return anioUpdated;
  });

  return updated;
}

async function deleteAnio({ id, user }) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
  }

  const current = await prisma.anioLectivo.findUnique({
    where: { id: parsedId }
  });

  if (!current) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  if (current.estado !== 'BORRADOR') {
    throw createHttpError('Solo se puede eliminar un anio lectivo en estado BORRADOR.', 400);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.anioLectivo.delete({
        where: { id: parsedId }
      });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'AnioLectivo',
        idRegistro: parsedId,
        tipoOperacion: 'DELETE',
        valorAnterior: current,
        valorNuevo: null,
        prismaClient: tx
      });
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw createHttpError('No se puede eliminar el anio porque tiene relaciones activas.', 400);
    }

    throw error;
  }
}

module.exports = {
  getAnios,
  getAnioActual,
  getAnioById,
  createAnio,
  updateAnio,
  updateEstado,
  deleteAnio
};
