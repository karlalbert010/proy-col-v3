const prisma = require('../../config/prisma');
const auditLogger = require('../../utils/auditLogger');

const TIPOS = [
  'PARCIAL',
  'TRABAJO_PRACTICO',
  'ORAL',
  'TAREA',
  'OTRO',
  'ORIENTADORA',
  'MES_1',
  'MES_2',
  'MES_3',
  'RECUPERATORIO'
];

const ESTADOS = ['ABIERTA', 'CERRADA'];

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

function parseNullablePositiveInteger(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return parsePositiveInteger(value, fieldName);
}

function parseNullableNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createHttpError(`El campo ${fieldName} debe ser numerico.`, 400);
  }
  return parsed;
}

function parseTipo(value) {
  const tipo = String(value || '').trim().toUpperCase();
  if (!TIPOS.includes(tipo)) {
    throw createHttpError(`El campo tipo debe ser uno de: ${TIPOS.join(', ')}.`, 400);
  }
  return tipo;
}

function parseEstado(value) {
  const estado = String(value || '').trim().toUpperCase();
  if (!ESTADOS.includes(estado)) {
    throw createHttpError(`El campo estado debe ser uno de: ${ESTADOS.join(', ')}.`, 400);
  }
  return estado;
}

function parseFecha(value, fieldName) {
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
            curso: { include: { anio: true } },
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
    },
    configEvaluacion: true,
    evaluacionPadre: true
  };
}

async function ensureReferences({ cursoMateriaId, periodoId, configEvaluacionId, evaluacionPadreId }) {
  const [asignacion, periodo, config, padre] = await Promise.all([
    resolveAsignacionDocente(cursoMateriaId),
    prisma.periodo.findUnique({ where: { id: periodoId } }),
    configEvaluacionId
      ? prisma.configEvaluacion.findUnique({ where: { id: configEvaluacionId } })
      : null,
    evaluacionPadreId
      ? prisma.evaluacion.findUnique({
          where: { id: evaluacionPadreId },
          include: { cursoMateriaDocente: { select: { cursoMateriaId: true } } }
        })
      : null
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

  if (config) {
    if (config.cursoMateriaId !== asignacion.cursoMateriaId || config.periodoId !== periodoId) {
      throw createHttpError(
        'ConfigEvaluacion debe pertenecer al mismo cursoMateria y periodo.',
        400
      );
    }
  }

  if (padre) {
    if (padre.cursoMateriaDocente.cursoMateriaId !== asignacion.cursoMateriaId || padre.periodoId !== periodoId) {
      throw createHttpError(
        'Evaluacion padre debe pertenecer al mismo cursoMateria y periodo.',
        400
      );
    }
  }

  return asignacion;
}

function buildWhere(filters) {
  const and = [];

  if (filters.cursoMateriaDocenteId !== undefined) {
    throw createHttpError('El parametro cursoMateriaDocenteId ya no es valido. Use cursoMateriaId.', 400);
  }

  if (filters.anio !== undefined && String(filters.anio).trim() !== '') {
    const anio = Number(filters.anio);
    if (!Number.isInteger(anio)) {
      throw createHttpError('El parametro anio debe ser numerico.', 400);
    }
    and.push({
      periodo: {
        anio: {
          anio
        }
      }
    });
  }

  if (filters.cursoMateriaId !== undefined) {
    const cursoMateriaId = parseNullablePositiveInteger(filters.cursoMateriaId, 'cursoMateriaId');
    if (cursoMateriaId) {
      and.push({
        cursoMateriaDocente: {
          cursoMateriaId
        }
      });
    }
  }

  if (filters.periodoId !== undefined) {
    const periodoId = parseNullablePositiveInteger(filters.periodoId, 'periodoId');
    if (periodoId) {
      and.push({ periodoId });
    }
  }

  if (filters.tipo !== undefined && String(filters.tipo).trim() !== '') {
    and.push({ tipo: parseTipo(filters.tipo) });
  }

  if (filters.estado !== undefined && String(filters.estado).trim() !== '') {
    and.push({ estado: parseEstado(filters.estado) });
  }

  return and.length ? { AND: and } : {};
}

function parseCreatePayload(payload) {
  if (payload.cursoMateriaDocenteId !== undefined) {
    throw createHttpError('El campo cursoMateriaDocenteId ya no es valido. Use cursoMateriaId.', 400);
  }

  const data = {
    cursoMateriaId: parsePositiveInteger(payload.cursoMateriaId, 'cursoMateriaId'),
    periodoId: parsePositiveInteger(payload.periodoId, 'periodoId'),
    configEvaluacionId: parseNullablePositiveInteger(payload.configEvaluacionId, 'configEvaluacionId'),
    evaluacionPadreId: parseNullablePositiveInteger(payload.evaluacionPadreId, 'evaluacionPadreId'),
    tipo: parseTipo(payload.tipo),
    fecha: parseFecha(payload.fecha, 'fecha'),
    titulo: String(payload.titulo || '').trim(),
    descripcion:
      payload.descripcion === undefined || payload.descripcion === null
        ? null
        : String(payload.descripcion).trim(),
    ponderacion: parseNullableNumber(payload.ponderacion, 'ponderacion'),
    estado: payload.estado ? parseEstado(payload.estado) : 'ABIERTA'
  };

  if (!data.titulo) {
    throw createHttpError('El campo titulo es obligatorio.', 400);
  }

  return data;
}

function parseUpdatePayload(payload) {
  if (payload.cursoMateriaDocenteId !== undefined) {
    throw createHttpError('El campo cursoMateriaDocenteId ya no es valido. Use cursoMateriaId.', 400);
  }

  const data = {};
  if (payload.cursoMateriaId !== undefined) {
    data.cursoMateriaId = parsePositiveInteger(payload.cursoMateriaId, 'cursoMateriaId');
  }
  if (payload.periodoId !== undefined) {
    data.periodoId = parsePositiveInteger(payload.periodoId, 'periodoId');
  }
  if (payload.configEvaluacionId !== undefined) {
    data.configEvaluacionId = parseNullablePositiveInteger(payload.configEvaluacionId, 'configEvaluacionId');
  }
  if (payload.evaluacionPadreId !== undefined) {
    data.evaluacionPadreId = parseNullablePositiveInteger(payload.evaluacionPadreId, 'evaluacionPadreId');
  }
  if (payload.tipo !== undefined) {
    data.tipo = parseTipo(payload.tipo);
  }
  if (payload.fecha !== undefined) {
    data.fecha = parseFecha(payload.fecha, 'fecha');
  }
  if (payload.titulo !== undefined) {
    data.titulo = String(payload.titulo || '').trim();
    if (!data.titulo) {
      throw createHttpError('El campo titulo no puede quedar vacio.', 400);
    }
  }
  if (payload.descripcion !== undefined) {
    data.descripcion = payload.descripcion === null ? null : String(payload.descripcion).trim();
  }
  if (payload.ponderacion !== undefined) {
    data.ponderacion = parseNullableNumber(payload.ponderacion, 'ponderacion');
  }
  if (payload.estado !== undefined) {
    data.estado = parseEstado(payload.estado);
  }
  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }
  return data;
}

async function getEvaluaciones(filters) {
  return prisma.evaluacion.findMany({
    where: buildWhere(filters),
    include: buildInclude(),
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }]
  });
}

async function getEvaluacionById(id) {
  const evaluacionId = parsePositiveInteger(id, 'id');
  const evaluacion = await prisma.evaluacion.findUnique({
    where: { id: evaluacionId },
    include: buildInclude()
  });

  if (!evaluacion) {
    throw createHttpError('Evaluacion no encontrada.', 404);
  }

  return evaluacion;
}

async function createEvaluacion(payload, user) {
  const data = parseCreatePayload(payload);
  const asignacion = await ensureReferences(data);

  const created = await prisma.evaluacion.create({
    data: {
      cursoMateriaDocenteId: asignacion.id,
      periodoId: data.periodoId,
      configEvaluacionId: data.configEvaluacionId,
      evaluacionPadreId: data.evaluacionPadreId,
      tipo: data.tipo,
      fecha: data.fecha,
      titulo: data.titulo,
      descripcion: data.descripcion,
      ponderacion: data.ponderacion,
      estado: data.estado
    },
    include: buildInclude()
  });

  await auditLogger({
    usuario: `user:${user.id}`,
    tablaAfectada: 'Evaluacion',
    idRegistro: created.id,
    tipoOperacion: 'INSERT',
    valorAnterior: null,
    valorNuevo: created
  });

  return created;
}

async function updateEvaluacion({ id, payload, user }) {
  const evaluacionId = parsePositiveInteger(id, 'id');
  const current = await prisma.evaluacion.findUnique({
    where: { id: evaluacionId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('Evaluacion no encontrada.', 404);
  }

  const data = parseUpdatePayload(payload);
  const refs = {
    cursoMateriaId: data.cursoMateriaId ?? current.cursoMateriaDocente.cursoMateriaId,
    periodoId: data.periodoId ?? current.periodoId,
    configEvaluacionId:
      data.configEvaluacionId !== undefined ? data.configEvaluacionId : current.configEvaluacionId,
    evaluacionPadreId:
      data.evaluacionPadreId !== undefined ? data.evaluacionPadreId : current.evaluacionPadreId
  };

  if (refs.evaluacionPadreId === evaluacionId) {
    throw createHttpError('Una evaluacion no puede ser su propia evaluacion padre.', 400);
  }

  const asignacion = await ensureReferences(refs);
  data.cursoMateriaDocenteId = asignacion.id;
  delete data.cursoMateriaId;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.evaluacion.update({
      where: { id: evaluacionId },
      data,
      include: buildInclude()
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Evaluacion',
      idRegistro: evaluacionId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteEvaluacion({ id, user }) {
  const evaluacionId = parsePositiveInteger(id, 'id');
  const current = await prisma.evaluacion.findUnique({
    where: { id: evaluacionId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('Evaluacion no encontrada.', 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.evaluacion.delete({ where: { id: evaluacionId } });
    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Evaluacion',
      idRegistro: evaluacionId,
      tipoOperacion: 'DELETE',
      valorAnterior: current,
      valorNuevo: null,
      prismaClient: tx
    });
  });
}

module.exports = {
  getEvaluaciones,
  getEvaluacionById,
  createEvaluacion,
  updateEvaluacion,
  deleteEvaluacion
};
