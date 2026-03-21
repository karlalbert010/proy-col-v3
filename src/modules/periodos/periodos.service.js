const prisma = require('../../config/prisma');
const auditLogger = require('../../utils/auditLogger');

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

function normalizeString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(`El campo ${fieldName} es obligatorio.`, 400);
  }

  return value.trim();
}

async function getPeriodos({ anio }) {
  const where = {};

  if (anio !== undefined) {
    const anioValue = Number(anio);

    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }

    where.anio = { anio: anioValue };
  }

  return prisma.periodo.findMany({
    where,
    include: {
      anio: true
    },
    orderBy: [{ anio: { anio: 'desc' } }, { orden: 'asc' }]
  });
}

async function getPeriodoById(id) {
  const periodoId = parsePositiveInteger(id, 'id');

  const periodo = await prisma.periodo.findUnique({
    where: { id: periodoId },
    include: {
      anio: true
    }
  });

  if (!periodo) {
    throw createHttpError('Periodo no encontrado.', 404);
  }

  return periodo;
}

async function createPeriodo(payload) {
  const nombre = normalizeString(payload.nombre, 'nombre');
  const orden = parsePositiveInteger(payload.orden, 'orden');
  const anioId = parsePositiveInteger(payload.anioId, 'anioId');

  const anio = await prisma.anioLectivo.findUnique({ where: { id: anioId } });
  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  try {
    return await prisma.periodo.create({
      data: {
        nombre,
        orden,
        anioId
      },
      include: {
        anio: true
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('No se permite duplicar la combinacion anioId + orden.', 400);
    }

    throw error;
  }
}

async function updatePeriodo({ id, payload, user }) {
  const periodoId = parsePositiveInteger(id, 'id');

  const current = await prisma.periodo.findUnique({
    where: { id: periodoId },
    include: { anio: true }
  });

  if (!current) {
    throw createHttpError('Periodo no encontrado.', 404);
  }

  const data = {};

  if (payload.nombre !== undefined) {
    data.nombre = normalizeString(payload.nombre, 'nombre');
  }
  if (payload.orden !== undefined) {
    data.orden = parsePositiveInteger(payload.orden, 'orden');
  }
  if (payload.anioId !== undefined) {
    data.anioId = parsePositiveInteger(payload.anioId, 'anioId');
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  const finalAnioId = data.anioId ?? current.anioId;
  const anio = await prisma.anioLectivo.findUnique({ where: { id: finalAnioId } });
  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.periodo.update({
        where: { id: periodoId },
        data,
        include: { anio: true }
      });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Periodo',
        idRegistro: periodoId,
        tipoOperacion: 'UPDATE',
        valorAnterior: current,
        valorNuevo: updated,
        prismaClient: tx
      });

      return updated;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('No se permite duplicar la combinacion anioId + orden.', 400);
    }

    throw error;
  }
}

async function deletePeriodo({ id, user }) {
  const periodoId = parsePositiveInteger(id, 'id');

  const current = await prisma.periodo.findUnique({
    where: { id: periodoId },
    include: { anio: true }
  });

  if (!current) {
    throw createHttpError('Periodo no encontrado.', 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.periodo.delete({ where: { id: periodoId } });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Periodo',
        idRegistro: periodoId,
        tipoOperacion: 'DELETE',
        valorAnterior: current,
        valorNuevo: null,
        prismaClient: tx
      });
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw createHttpError('No se puede eliminar el periodo porque tiene relaciones activas.', 400);
    }

    throw error;
  }
}

module.exports = {
  getPeriodos,
  getPeriodoById,
  createPeriodo,
  updatePeriodo,
  deletePeriodo
};
