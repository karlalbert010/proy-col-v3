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

async function getAlumnos({ cursoId, curso }) {
  const where = {};

  if (cursoId !== undefined && cursoId !== null && String(cursoId).trim() !== '') {
    const cursoIdValue = parsePositiveInteger(cursoId, 'cursoId');
    where.matriculas = {
      some: {
        cursoId: cursoIdValue
      }
    };
  } else if (curso !== undefined && curso !== null && String(curso).trim() !== '') {
    where.matriculas = {
      some: {
        curso: {
          nombre: normalizeString(curso, 'curso')
        }
      }
    };
  }

  return prisma.alumno.findMany({
    where,
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }]
  });
}

async function getAlumnoById(id) {
  const alumnoId = parsePositiveInteger(id, 'id');
  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId } });

  if (!alumno) {
    throw createHttpError('Alumno no encontrado.', 404);
  }

  return alumno;
}

async function createAlumno(payload) {
  const apellido = normalizeString(payload.apellido, 'apellido');
  const nombre = normalizeString(payload.nombre, 'nombre');
  const dni = normalizeString(payload.dni, 'dni');

  try {
    return await prisma.alumno.create({
      data: {
        apellido,
        nombre,
        dni,
        activo: payload.activo === undefined ? true : Boolean(payload.activo)
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('El DNI ya existe.', 400);
    }

    throw error;
  }
}

async function updateAlumno({ id, payload, user }) {
  const alumnoId = parsePositiveInteger(id, 'id');

  const current = await prisma.alumno.findUnique({ where: { id: alumnoId } });
  if (!current) {
    throw createHttpError('Alumno no encontrado.', 404);
  }

  const data = {};

  if (payload.apellido !== undefined) {
    data.apellido = normalizeString(payload.apellido, 'apellido');
  }
  if (payload.nombre !== undefined) {
    data.nombre = normalizeString(payload.nombre, 'nombre');
  }
  if (payload.dni !== undefined) {
    data.dni = normalizeString(payload.dni, 'dni');
  }
  if (payload.activo !== undefined) {
    data.activo = Boolean(payload.activo);
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.alumno.update({
        where: { id: alumnoId },
        data
      });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Alumno',
        idRegistro: alumnoId,
        tipoOperacion: 'UPDATE',
        valorAnterior: current,
        valorNuevo: updated,
        prismaClient: tx
      });

      return updated;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('El DNI ya existe.', 400);
    }

    throw error;
  }
}

async function deleteAlumno({ id, user }) {
  const alumnoId = parsePositiveInteger(id, 'id');

  const current = await prisma.alumno.findUnique({ where: { id: alumnoId } });
  if (!current) {
    throw createHttpError('Alumno no encontrado.', 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.alumno.delete({ where: { id: alumnoId } });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Alumno',
        idRegistro: alumnoId,
        tipoOperacion: 'DELETE',
        valorAnterior: current,
        valorNuevo: null,
        prismaClient: tx
      });
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw createHttpError(
        'No se puede eliminar el alumno porque tiene relaciones activas (por ejemplo matriculas).',
        400
      );
    }

    throw error;
  }
}

module.exports = {
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno
};
