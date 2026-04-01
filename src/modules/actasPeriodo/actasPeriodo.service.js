const prisma = require('../../config/prisma');
const auditLogger = require('../../utils/auditLogger');

const ESTADOS = ['ABIERTA', 'CERRADA', 'FIRMADA'];

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

function parseOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return parsePositiveInteger(value, fieldName);
}

function parseEstado(value) {
  const estado = String(value || '')
    .trim()
    .toUpperCase();
  if (!ESTADOS.includes(estado)) {
    throw createHttpError(`El campo estado debe ser uno de: ${ESTADOS.join(', ')}.`, 400);
  }
  return estado;
}

function parseFecha(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`El campo ${fieldName} debe tener formato de fecha valido.`, 400);
  }
  return date;
}

async function resolveAsignacionDocente(cursoMateriaId) {
  const cursoMateriaIdValue = parsePositiveInteger(cursoMateriaId, 'cursoMateriaId');

  let asignacion = await prisma.cursoMateriaDocente.findFirst({
    where: { cursoMateriaId: cursoMateriaIdValue, activo: true },
    include: {
      cursoMateria: {
        include: {
          curso: true,
          materiaAnual: true
        }
      }
    },
    orderBy: [{ fechaDesde: 'desc' }, { id: 'desc' }]
  });

  if (!asignacion) {
    asignacion = await prisma.cursoMateriaDocente.findFirst({
      where: { cursoMateriaId: cursoMateriaIdValue },
      include: {
        cursoMateria: {
          include: {
            curso: true,
            materiaAnual: true
          }
        }
      },
      orderBy: [{ fechaDesde: 'desc' }, { id: 'desc' }]
    });
  }

  if (!asignacion) {
    throw createHttpError('No existe asignacion docente para el cursoMateriaId indicado.', 404);
  }

  return asignacion;
}

function buildInclude() {
  return {
    cursoMateriaDocente: {
      include: {
        cursoMateria: {
          include: {
            curso: {
              include: {
                anio: true
              }
            },
            materiaAnual: true
          }
        },
        docente: true
      }
    },
    periodo: {
      include: {
        anio: true
      }
    }
  };
}

async function ensureReferences(cursoMateriaId, periodoId) {
  const [asignacion, periodo] = await Promise.all([
    resolveAsignacionDocente(cursoMateriaId),
    prisma.periodo.findUnique({ where: { id: periodoId } })
  ]);

  if (!periodo) {
    throw createHttpError('Periodo no encontrado.', 404);
  }

  const cursoAnioId = asignacion.cursoMateria.curso.anioId;
  const materiaAnioId = asignacion.cursoMateria.materiaAnual.anioId;

  if (cursoAnioId !== periodo.anioId || materiaAnioId !== periodo.anioId) {
    throw createHttpError(
      'Curso, materia anual y periodo deben pertenecer al mismo anio lectivo.',
      400
    );
  }

  return asignacion;
}

function buildWhere({ anio, cursoMateriaId, cursoMateriaDocenteId, periodoId, estado }) {
  const and = [];

  if (cursoMateriaDocenteId !== undefined) {
    throw createHttpError('El parametro cursoMateriaDocenteId ya no es valido. Use cursoMateriaId.', 400);
  }

  if (anio !== undefined && String(anio).trim() !== '') {
    const anioValue = Number(anio);
    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }
    and.push({
      periodo: {
        anio: {
          anio: anioValue
        }
      }
    });
  }

  if (cursoMateriaId !== undefined) {
    const parsed = parseOptionalPositiveInteger(cursoMateriaId, 'cursoMateriaId');
    if (parsed) {
      and.push({
        cursoMateriaDocente: {
          cursoMateriaId: parsed
        }
      });
    }
  }

  if (periodoId !== undefined) {
    const parsed = parseOptionalPositiveInteger(periodoId, 'periodoId');
    if (parsed) {
      and.push({ periodoId: parsed });
    }
  }

  if (estado !== undefined && String(estado).trim() !== '') {
    and.push({ estado: parseEstado(estado) });
  }

  return and.length ? { AND: and } : {};
}

async function getActasPeriodo(filters) {
  return prisma.actaPeriodo.findMany({
    where: buildWhere(filters),
    include: buildInclude(),
    orderBy: [{ id: 'desc' }]
  });
}

async function getActaPeriodoById(id) {
  const actaId = parsePositiveInteger(id, 'id');
  const acta = await prisma.actaPeriodo.findUnique({
    where: { id: actaId },
    include: buildInclude()
  });

  if (!acta) {
    throw createHttpError('ActaPeriodo no encontrada.', 404);
  }

  return acta;
}

async function createActaPeriodo(payload, user) {
  if (payload.cursoMateriaDocenteId !== undefined) {
    throw createHttpError('El campo cursoMateriaDocenteId ya no es valido. Use cursoMateriaId.', 400);
  }

  const cursoMateriaId = parsePositiveInteger(payload.cursoMateriaId, 'cursoMateriaId');
  const periodoId = parsePositiveInteger(payload.periodoId, 'periodoId');
  const estado = payload.estado ? parseEstado(payload.estado) : 'ABIERTA';
  const fechaApertura = parseFecha(payload.fechaApertura, 'fechaApertura') || new Date();
  let fechaCierre = parseFecha(payload.fechaCierre, 'fechaCierre');
  const observaciones =
    payload.observaciones === undefined || payload.observaciones === null
      ? null
      : String(payload.observaciones).trim();

  const asignacion = await ensureReferences(cursoMateriaId, periodoId);

  const duplicated = await prisma.actaPeriodo.findFirst({
    where: { cursoMateriaDocenteId: asignacion.id, periodoId }
  });
  if (duplicated) {
    throw createHttpError('Ya existe un ActaPeriodo para el curso/materia y periodo indicado.', 400);
  }

  if (estado === 'ABIERTA') {
    fechaCierre = null;
  } else if (!fechaCierre) {
    fechaCierre = new Date();
  }

  const created = await prisma.actaPeriodo.create({
    data: {
      cursoMateriaDocenteId: asignacion.id,
      periodoId,
      estado,
      fechaApertura,
      fechaCierre,
      observaciones
    },
    include: buildInclude()
  });

  await auditLogger({
    usuario: `user:${user.id}`,
    tablaAfectada: 'ActaPeriodo',
    idRegistro: created.id,
    tipoOperacion: 'INSERT',
    valorAnterior: null,
    valorNuevo: created
  });

  return created;
}

async function updateActaPeriodo({ id, payload, user }) {
  const actaId = parsePositiveInteger(id, 'id');
  const current = await prisma.actaPeriodo.findUnique({
    where: { id: actaId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('ActaPeriodo no encontrada.', 404);
  }

  const data = {};

  if (payload.cursoMateriaDocenteId !== undefined) {
    throw createHttpError('El campo cursoMateriaDocenteId ya no es valido. Use cursoMateriaId.', 400);
  }
  if (payload.cursoMateriaId !== undefined) {
    const asignacion = await resolveAsignacionDocente(payload.cursoMateriaId);
    data.cursoMateriaDocenteId = asignacion.id;
  }
  if (payload.periodoId !== undefined) {
    data.periodoId = parsePositiveInteger(payload.periodoId, 'periodoId');
  }
  if (payload.estado !== undefined) {
    data.estado = parseEstado(payload.estado);
  }
  if (payload.fechaApertura !== undefined) {
    data.fechaApertura = parseFecha(payload.fechaApertura, 'fechaApertura');
  }
  if (payload.fechaCierre !== undefined) {
    data.fechaCierre = parseFecha(payload.fechaCierre, 'fechaCierre');
  }
  if (payload.observaciones !== undefined) {
    data.observaciones = payload.observaciones === null ? null : String(payload.observaciones).trim();
  }

  if (!Object.keys(data).length) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  const finalCursoMateriaDocenteId = data.cursoMateriaDocenteId ?? current.cursoMateriaDocenteId;
  const finalPeriodoId = data.periodoId ?? current.periodoId;

  const finalCursoMateriaId =
    data.cursoMateriaDocenteId !== undefined
      ? (await prisma.cursoMateriaDocente.findUnique({
          where: { id: data.cursoMateriaDocenteId },
          select: { cursoMateriaId: true }
        })).cursoMateriaId
      : current.cursoMateriaDocente.cursoMateriaId;

  await ensureReferences(finalCursoMateriaId, finalPeriodoId);

  const duplicated = await prisma.actaPeriodo.findFirst({
    where: {
      cursoMateriaDocenteId: finalCursoMateriaDocenteId,
      periodoId: finalPeriodoId,
      id: { not: actaId }
    }
  });
  if (duplicated) {
    throw createHttpError('Ya existe un ActaPeriodo para el curso/materia y periodo indicado.', 400);
  }

  const finalEstado = data.estado ?? current.estado;
  if (finalEstado === 'ABIERTA') {
    data.fechaCierre = null;
  } else if ((data.fechaCierre ?? current.fechaCierre) === null) {
    data.fechaCierre = new Date();
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.actaPeriodo.update({
      where: { id: actaId },
      data,
      include: buildInclude()
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'ActaPeriodo',
      idRegistro: actaId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteActaPeriodo({ id, user }) {
  const actaId = parsePositiveInteger(id, 'id');
  const current = await prisma.actaPeriodo.findUnique({
    where: { id: actaId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('ActaPeriodo no encontrada.', 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.actaPeriodo.delete({ where: { id: actaId } });
    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'ActaPeriodo',
      idRegistro: actaId,
      tipoOperacion: 'DELETE',
      valorAnterior: current,
      valorNuevo: null,
      prismaClient: tx
    });
  });
}

module.exports = {
  getActasPeriodo,
  getActaPeriodoById,
  createActaPeriodo,
  updateActaPeriodo,
  deleteActaPeriodo
};
