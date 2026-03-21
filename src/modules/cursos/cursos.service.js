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

function parseEstado(estado) {
  const allowed = ['BORRADOR', 'ACTIVO', 'CERRADO'];
  const value = String(estado || '')
    .trim()
    .toUpperCase();

  if (!allowed.includes(value)) {
    throw createHttpError('El parametro estado debe ser BORRADOR, ACTIVO o CERRADO.', 400);
  }

  return value;
}

async function getCursos({ anio, estado }) {
  const where = {};
  const anioWhere = {};

  if (anio !== undefined) {
    const anioValue = Number(anio);

    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }

    anioWhere.anio = anioValue;
  }

  if (estado !== undefined && estado !== null && String(estado).trim() !== '') {
    anioWhere.estado = parseEstado(estado);
  }

  if (Object.keys(anioWhere).length > 0) {
    where.anio = anioWhere;
  }

  return prisma.curso.findMany({
    where,
    include: {
      anio: true
    },
    orderBy: [{ nombre: 'asc' }]
  });
}

async function getCursoById(id) {
  const cursoId = parsePositiveInteger(id, 'id');
  const curso = await prisma.curso.findUnique({
    where: { id: cursoId },
    include: { anio: true }
  });

  if (!curso) {
    throw createHttpError('Curso no encontrado.', 404);
  }

  return curso;
}

async function createCurso(payload) {
  const nombre = normalizeString(payload.nombre, 'nombre');
  const anioId = parsePositiveInteger(payload.anioId, 'anioId');

  const anio = await prisma.anioLectivo.findUnique({ where: { id: anioId } });
  if (!anio) {
    throw createHttpError('El curso debe pertenecer a un anio existente.', 400);
  }

  return prisma.curso.create({
    data: {
      nombre,
      anioId
    },
    include: {
      anio: true
    }
  });
}

async function updateCurso({ id, payload, user }) {
  const cursoId = parsePositiveInteger(id, 'id');

  const current = await prisma.curso.findUnique({
    where: { id: cursoId },
    include: { anio: true }
  });

  if (!current) {
    throw createHttpError('Curso no encontrado.', 404);
  }

  const data = {};

  if (payload.nombre !== undefined) {
    data.nombre = normalizeString(payload.nombre, 'nombre');
  }
  if (payload.anioId !== undefined) {
    data.anioId = parsePositiveInteger(payload.anioId, 'anioId');
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  if (data.anioId !== undefined) {
    const anio = await prisma.anioLectivo.findUnique({ where: { id: data.anioId } });
    if (!anio) {
      throw createHttpError('El curso debe pertenecer a un anio existente.', 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.curso.update({
      where: { id: cursoId },
      data,
      include: { anio: true }
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Curso',
      idRegistro: cursoId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteCurso({ id, user }) {
  const cursoId = parsePositiveInteger(id, 'id');

  const current = await prisma.curso.findUnique({
    where: { id: cursoId },
    include: { anio: true }
  });

  if (!current) {
    throw createHttpError('Curso no encontrado.', 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.curso.delete({ where: { id: cursoId } });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Curso',
        idRegistro: cursoId,
        tipoOperacion: 'DELETE',
        valorAnterior: current,
        valorNuevo: null,
        prismaClient: tx
      });
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw createHttpError(
        'No se puede eliminar el curso porque tiene relaciones activas (por ejemplo matriculas).',
        400
      );
    }

    throw error;
  }
}

module.exports = {
  getCursos,
  getCursoById,
  createCurso,
  updateCurso,
  deleteCurso
};
