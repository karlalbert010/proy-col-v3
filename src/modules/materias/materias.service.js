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

function parseBoolean(value, fieldName) {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw createHttpError(`El parametro ${fieldName} debe ser true o false.`, 400);
}

async function getMaterias({ activa, anio }) {
  const where = {};

  if (activa !== undefined && activa !== null && String(activa).trim() !== '') {
    where.activa = parseBoolean(activa, 'activa');
  }

  if (anio !== undefined && anio !== null && String(anio).trim() !== '') {
    const anioValue = Number(anio);
    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }
    where.versiones = {
      some: {
        anio: {
          anio: anioValue
        }
      }
    };
  }

  return prisma.materia.findMany({
    where,
    orderBy: [{ codigoBase: 'asc' }]
  });
}

async function getMateriaById(id) {
  const materiaId = parsePositiveInteger(id, 'id');
  const materia = await prisma.materia.findUnique({ where: { id: materiaId } });

  if (!materia) {
    throw createHttpError('Materia no encontrada.', 404);
  }

  return materia;
}

async function createMateria(payload) {
  const codigoBase = normalizeString(payload.codigoBase, 'codigoBase');

  const descripcion =
    payload.descripcion === undefined ? null : normalizeString(payload.descripcion, 'descripcion', false);

  try {
    return await prisma.materia.create({
      data: {
        codigoBase,
        descripcion,
        activa: payload.activa === undefined ? true : Boolean(payload.activa)
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('Ya existe una materia con ese codigoBase.', 400);
    }

    throw error;
  }
}

async function updateMateria({ id, payload, user }) {
  const materiaId = parsePositiveInteger(id, 'id');

  const current = await prisma.materia.findUnique({ where: { id: materiaId } });
  if (!current) {
    throw createHttpError('Materia no encontrada.', 404);
  }

  const data = {};

  if (payload.codigoBase !== undefined) {
    data.codigoBase = normalizeString(payload.codigoBase, 'codigoBase');
  }
  if (payload.descripcion !== undefined) {
    data.descripcion = normalizeString(payload.descripcion, 'descripcion', false);
  }
  if (payload.activa !== undefined) {
    data.activa = Boolean(payload.activa);
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.materia.update({
        where: { id: materiaId },
        data
      });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Materia',
        idRegistro: materiaId,
        tipoOperacion: 'UPDATE',
        valorAnterior: current,
        valorNuevo: updated,
        prismaClient: tx
      });

      return updated;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('Ya existe una materia con ese codigoBase.', 400);
    }

    throw error;
  }
}

async function deleteMateria({ id, user }) {
  const materiaId = parsePositiveInteger(id, 'id');

  const current = await prisma.materia.findUnique({ where: { id: materiaId } });
  if (!current) {
    throw createHttpError('Materia no encontrada.', 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.materia.delete({ where: { id: materiaId } });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Materia',
        idRegistro: materiaId,
        tipoOperacion: 'DELETE',
        valorAnterior: current,
        valorNuevo: null,
        prismaClient: tx
      });
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw createHttpError('No se puede eliminar la materia porque tiene relaciones activas.', 400);
    }

    throw error;
  }
}

module.exports = {
  getMaterias,
  getMateriaById,
  createMateria,
  updateMateria,
  deleteMateria
};
