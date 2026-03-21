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

function parseBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') {
    return true;
  }
  if (normalized === '0' || normalized === 'false') {
    return false;
  }

  throw createHttpError(`El campo ${fieldName} debe ser booleano (true/false o 1/0).`, 400);
}

async function getMatriculas({ anio }) {
  const where = {};

  if (anio !== undefined && anio !== null && String(anio).trim() !== '') {
    const anioValue = Number(anio);
    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }
    where.curso = {
      anio: {
        anio: anioValue
      }
    };
  }

  return prisma.matricula.findMany({
    where,
    include: {
      alumno: true,
      anioLectivo: true,
      curso: {
        include: { anio: true }
      }
    },
    orderBy: [{ id: 'desc' }]
  });
}

async function getMatriculaById(id) {
  const matriculaId = parsePositiveInteger(id, 'id');
  const matricula = await prisma.matricula.findUnique({
    where: { id: matriculaId },
    include: {
      alumno: true,
      anioLectivo: true,
      curso: {
        include: { anio: true }
      }
    }
  });

  if (!matricula) {
    throw createHttpError('Matricula no encontrada.', 404);
  }

  return matricula;
}

async function createMatricula(payload) {
  const alumnoId = parsePositiveInteger(payload.alumnoId, 'alumnoId');
  const cursoId = parsePositiveInteger(payload.cursoId, 'cursoId');

  const estadoPago =
    payload.estado_pago === undefined ? false : parseBoolean(payload.estado_pago, 'estado_pago');
  const estadoPagoMensual =
    payload.estado_pago_mensual === undefined
      ? false
      : parseBoolean(payload.estado_pago_mensual, 'estado_pago_mensual');

  const [alumno, curso] = await Promise.all([
    prisma.alumno.findUnique({ where: { id: alumnoId } }),
    prisma.curso.findUnique({ where: { id: cursoId } })
  ]);

  if (!alumno) {
    throw createHttpError('Alumno no encontrado.', 404);
  }

  if (!curso) {
    throw createHttpError('Curso no encontrado.', 404);
  }

  const duplicated = await prisma.matricula.findFirst({
    where: {
      alumnoId,
      cursoId
    }
  });

  if (duplicated) {
    throw createHttpError('No se puede duplicar la matricula para el mismo alumno y curso.', 400);
  }

  return prisma.matricula.create({
    data: {
      alumnoId,
      cursoId,
      anioLectivoId: curso.anioId,
      estado: 'ACTIVA',
      estado_pago: estadoPago,
      estado_pago_mensual: estadoPagoMensual
    },
    include: {
      alumno: true,
      anioLectivo: true,
      curso: {
        include: {
          anio: true
        }
      }
    }
  });
}

async function updateMatricula({ id, payload, user }) {
  const matriculaId = parsePositiveInteger(id, 'id');

  const current = await prisma.matricula.findUnique({
    where: { id: matriculaId },
    include: {
      alumno: true,
      anioLectivo: true,
      curso: true
    }
  });

  if (!current) {
    throw createHttpError('Matricula no encontrada.', 404);
  }

  const data = {};
  if (payload.alumnoId !== undefined) {
    data.alumnoId = parsePositiveInteger(payload.alumnoId, 'alumnoId');
  }
  if (payload.cursoId !== undefined) {
    data.cursoId = parsePositiveInteger(payload.cursoId, 'cursoId');
  }
  if (payload.estado !== undefined) {
    const estado = String(payload.estado).trim().toUpperCase();
    if (!['ACTIVA', 'BAJA'].includes(estado)) {
      throw createHttpError('El campo estado debe ser ACTIVA o BAJA.', 400);
    }
    data.estado = estado;
  }
  if (payload.estado_pago !== undefined) {
    data.estado_pago = parseBoolean(payload.estado_pago, 'estado_pago');
  }
  if (payload.estado_pago_mensual !== undefined) {
    data.estado_pago_mensual = parseBoolean(payload.estado_pago_mensual, 'estado_pago_mensual');
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  const finalAlumnoId = data.alumnoId ?? current.alumnoId;
  const finalCursoId = data.cursoId ?? current.cursoId;

  const [alumno, curso] = await Promise.all([
    prisma.alumno.findUnique({ where: { id: finalAlumnoId } }),
    prisma.curso.findUnique({ where: { id: finalCursoId } })
  ]);

  if (!alumno) {
    throw createHttpError('Alumno no encontrado.', 404);
  }
  if (!curso) {
    throw createHttpError('Curso no encontrado.', 404);
  }

  const duplicated = await prisma.matricula.findFirst({
    where: {
      alumnoId: finalAlumnoId,
      cursoId: finalCursoId,
      id: { not: matriculaId }
    }
  });

  if (duplicated) {
    throw createHttpError('No se puede duplicar la matricula para el mismo alumno y curso.', 400);
  }

  data.anioLectivoId = curso.anioId;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.matricula.update({
      where: { id: matriculaId },
      data,
      include: {
        alumno: true,
        anioLectivo: true,
        curso: {
          include: { anio: true }
        }
      }
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Matricula',
      idRegistro: matriculaId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteMatricula({ id, user }) {
  const matriculaId = parsePositiveInteger(id, 'id');

  const current = await prisma.matricula.findUnique({
    where: { id: matriculaId },
    include: {
      alumno: true,
      anioLectivo: true,
      curso: true
    }
  });

  if (!current) {
    throw createHttpError('Matricula no encontrada.', 404);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.matricula.delete({ where: { id: matriculaId } });

      await auditLogger({
        usuario: `user:${user.id}`,
        tablaAfectada: 'Matricula',
        idRegistro: matriculaId,
        tipoOperacion: 'DELETE',
        valorAnterior: current,
        valorNuevo: null,
        prismaClient: tx
      });
    });
  } catch (error) {
    if (error.code === 'P2003') {
      throw createHttpError('No se puede eliminar la matricula porque tiene relaciones activas.', 400);
    }

    throw error;
  }
}

module.exports = {
  getMatriculas,
  getMatriculaById,
  createMatricula,
  updateMatricula,
  deleteMatricula
};
