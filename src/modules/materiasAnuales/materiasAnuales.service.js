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

function parseNullableInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createHttpError(`El campo ${fieldName} debe ser un numero entero valido.`, 400);
  }

  return parsed;
}

function normalizeString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(`El campo ${fieldName} es obligatorio.`, 400);
  }

  return value.trim();
}

async function ensureReferences(materiaId, anioId) {
  const [materia, anio] = await Promise.all([
    prisma.materia.findUnique({ where: { id: materiaId } }),
    prisma.anioLectivo.findUnique({ where: { id: anioId } })
  ]);

  if (!materia) {
    throw createHttpError('Materia no encontrada.', 404);
  }

  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }
}

async function getMateriasAnuales({ anio }) {
  const where = {};

  if (anio !== undefined) {
    const anioValue = Number(anio);

    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }

    where.anio = { anio: anioValue };
  }

  return prisma.materiaAnual.findMany({
    where,
    include: {
      materia: true,
      anio: true
    },
    orderBy: [{ anio: { anio: 'desc' } }, { nombre: 'asc' }]
  });
}

async function getMateriaAnualById(id) {
  const materiaAnualId = parsePositiveInteger(id, 'id');

  const materiaAnual = await prisma.materiaAnual.findUnique({
    where: { id: materiaAnualId },
    include: {
      materia: true,
      anio: true
    }
  });

  if (!materiaAnual) {
    throw createHttpError('Materia anual no encontrada.', 404);
  }

  return materiaAnual;
}

async function createMateriaAnual(payload) {
  const materiaId = parsePositiveInteger(payload.materiaId, 'materiaId');
  const anioId = parsePositiveInteger(payload.anioId, 'anioId');
  const nombre = normalizeString(payload.nombre, 'nombre');
  const cargaHoraria = parseNullableInteger(payload.cargaHoraria, 'cargaHoraria');

  await ensureReferences(materiaId, anioId);

  try {
    return await prisma.materiaAnual.create({
      data: {
        materiaId,
        anioId,
        nombre,
        cargaHoraria
      },
      include: {
        materia: true,
        anio: true
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('No se permite duplicar la combinacion materiaId + anioId.', 400);
    }

    throw error;
  }
}

async function updateMateriaAnual({ id, payload, user }) {
  const materiaAnualId = parsePositiveInteger(id, 'id');

  const current = await prisma.materiaAnual.findUnique({
    where: { id: materiaAnualId },
    include: {
      materia: true,
      anio: true
    }
  });

  if (!current) {
    throw createHttpError('Materia anual no encontrada.', 404);
  }

  const data = {};

  if (payload.materiaId !== undefined) {
    data.materiaId = parsePositiveInteger(payload.materiaId, 'materiaId');
  }
  if (payload.anioId !== undefined) {
    data.anioId = parsePositiveInteger(payload.anioId, 'anioId');
  }
  if (payload.nombre !== undefined) {
    data.nombre = normalizeString(payload.nombre, 'nombre');
  }
  if (payload.cargaHoraria !== undefined) {
    data.cargaHoraria = parseNullableInteger(payload.cargaHoraria, 'cargaHoraria');
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  const finalMateriaId = data.materiaId ?? current.materiaId;
  const finalAnioId = data.anioId ?? current.anioId;

  await ensureReferences(finalMateriaId, finalAnioId);

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.materiaAnual.update({
        where: { id: materiaAnualId },
        data,
        include: {
          materia: true,
          anio: true
        }
      });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'MateriaAnual',
        idRegistro: materiaAnualId,
        tipoOperacion: 'UPDATE',
        valorAnterior: current,
        valorNuevo: updated,
        prismaClient: tx
      });

      return updated;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('No se permite duplicar la combinacion materiaId + anioId.', 400);
    }

    throw error;
  }
}

async function deleteMateriaAnual({ id, user }) {
  const materiaAnualId = parsePositiveInteger(id, 'id');

  const current = await prisma.materiaAnual.findUnique({
    where: { id: materiaAnualId },
    include: {
      materia: true,
      anio: true
    }
  });

  if (!current) {
    throw createHttpError('Materia anual no encontrada.', 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.materiaAnual.delete({ where: { id: materiaAnualId } });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'MateriaAnual',
        idRegistro: materiaAnualId,
        tipoOperacion: 'DELETE',
        valorAnterior: current,
        valorNuevo: null,
        prismaClient: tx
      });
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw createHttpError('No se puede eliminar la materia anual porque tiene relaciones activas.', 400);
    }

    throw error;
  }
}

module.exports = {
  getMateriasAnuales,
  getMateriaAnualById,
  createMateriaAnual,
  updateMateriaAnual,
  deleteMateriaAnual
};
