const prisma = require('../../config/prisma');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(`El parametro ${fieldName} debe ser numerico entero positivo.`, 400);
  }
  return parsed;
}

function parseBoolean(value, fieldName) {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw createHttpError(`El parametro ${fieldName} debe ser true o false.`, 400);
}

async function getAsignaciones({ anio, cursoId, materiaAnualId, docenteId, activo }) {
  const where = {};

  if (anio !== undefined && anio !== null && String(anio).trim() !== '') {
    const anioValue = Number(anio);
    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }
    where.cursoMateria = {
      curso: { anio: { anio: anioValue } }
    };
  }

  if (cursoId !== undefined && cursoId !== null && String(cursoId).trim() !== '') {
    where.cursoMateria = {
      ...(where.cursoMateria || {}),
      cursoId: parsePositiveInteger(cursoId, 'cursoId')
    };
  }

  if (materiaAnualId !== undefined && materiaAnualId !== null && String(materiaAnualId).trim() !== '') {
    where.cursoMateria = {
      ...(where.cursoMateria || {}),
      materiaAnualId: parsePositiveInteger(materiaAnualId, 'materiaAnualId')
    };
  }

  if (docenteId !== undefined && docenteId !== null && String(docenteId).trim() !== '') {
    where.docenteId = parsePositiveInteger(docenteId, 'docenteId');
  }

  if (activo !== undefined && activo !== null && String(activo).trim() !== '') {
    where.activo = parseBoolean(activo, 'activo');
  }

  return prisma.cursoMateriaDocente.findMany({
    where,
    include: {
      cursoMateria: {
        include: {
          curso: { include: { anio: true } },
          materiaAnual: { include: { materia: true, anio: true } }
        }
      },
      docente: { include: { usuario: true } }
    },
    orderBy: [
      { cursoMateria: { curso: { nombre: 'asc' } } },
      { cursoMateria: { materiaAnual: { nombre: 'asc' } } }
    ]
  });
}

module.exports = {
  getAsignaciones
};
