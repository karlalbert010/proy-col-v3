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

function parseNullableBoolean(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  throw createHttpError(`El campo ${fieldName} debe ser booleano.`, 400);
}

function parseTipo(value) {
  const tipo = String(value || '')
    .trim()
    .toUpperCase();
  if (!TIPOS.includes(tipo)) {
    throw createHttpError(`El campo tipo debe ser uno de: ${TIPOS.join(', ')}.`, 400);
  }
  return tipo;
}

function buildInclude() {
  return {
    cursoMateriaDocente: {
      include: {
        curso: {
          include: { anio: true }
        },
        materiaAnual: true,
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

async function ensureReferences(cursoMateriaDocenteId, periodoId) {
  const [cmd, periodo] = await Promise.all([
    prisma.cursoMateriaDocente.findUnique({
      where: { id: cursoMateriaDocenteId },
      include: { curso: true, materiaAnual: true }
    }),
    prisma.periodo.findUnique({ where: { id: periodoId } })
  ]);

  if (!cmd) {
    throw createHttpError('CursoMateriaDocente no encontrado.', 404);
  }
  if (!periodo) {
    throw createHttpError('Periodo no encontrado.', 404);
  }

  if (cmd.curso.anioId !== periodo.anioId || cmd.materiaAnual.anioId !== periodo.anioId) {
    throw createHttpError(
      'Curso, materia anual y periodo deben pertenecer al mismo anio lectivo.',
      400
    );
  }
}

function buildWhere(filters) {
  const and = [];

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

  if (filters.cursoMateriaDocenteId !== undefined) {
    const cmd = parseNullablePositiveInteger(filters.cursoMateriaDocenteId, 'cursoMateriaDocenteId');
    if (cmd) {
      and.push({ cursoMateriaDocenteId: cmd });
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

  if (filters.mes !== undefined && String(filters.mes).trim() !== '') {
    const mes = Number(filters.mes);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw createHttpError('El parametro mes debe ser un entero entre 1 y 12.', 400);
    }
    and.push({ mes });
  }

  return and.length ? { AND: and } : {};
}

function parsePayload(payload, partial = false) {
  const data = {};

  const required = (field) => {
    if (!partial && (payload[field] === undefined || payload[field] === null || payload[field] === '')) {
      throw createHttpError(`El campo ${field} es obligatorio.`, 400);
    }
  };

  required('cursoMateriaDocenteId');
  required('periodoId');
  required('tipo');

  if (payload.cursoMateriaDocenteId !== undefined) {
    data.cursoMateriaDocenteId = parsePositiveInteger(payload.cursoMateriaDocenteId, 'cursoMateriaDocenteId');
  }
  if (payload.periodoId !== undefined) {
    data.periodoId = parsePositiveInteger(payload.periodoId, 'periodoId');
  }
  if (payload.tipo !== undefined) {
    data.tipo = parseTipo(payload.tipo);
  }
  if (payload.mes !== undefined) {
    const mes = parseNullablePositiveInteger(payload.mes, 'mes');
    if (mes !== null && (mes < 1 || mes > 12)) {
      throw createHttpError('El campo mes debe ser un entero entre 1 y 12.', 400);
    }
    data.mes = mes;
  }
  if (payload.cantidadEvaluaciones !== undefined) {
    data.cantidadEvaluaciones = parsePositiveInteger(payload.cantidadEvaluaciones, 'cantidadEvaluaciones');
  }
  if (!partial && data.cantidadEvaluaciones === undefined) {
    data.cantidadEvaluaciones = 1;
  }

  if (payload.ponderacion !== undefined) {
    data.ponderacion = parseNullableNumber(payload.ponderacion, 'ponderacion');
  }
  if (payload.recuperatorioHabilitado !== undefined) {
    data.recuperatorioHabilitado = parseNullableBoolean(
      payload.recuperatorioHabilitado,
      'recuperatorioHabilitado'
    );
  }
  if (!partial && data.recuperatorioHabilitado === undefined) {
    data.recuperatorioHabilitado = false;
  }

  if (partial && Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  return data;
}

async function ensureUniqueCombination(data, excludeId = null) {
  const duplicated = await prisma.configEvaluacion.findFirst({
    where: {
      cursoMateriaDocenteId: data.cursoMateriaDocenteId,
      periodoId: data.periodoId,
      tipo: data.tipo,
      mes: data.mes ?? null,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });

  if (duplicated) {
    throw createHttpError(
      'Ya existe una configuracion para cursoMateriaDocenteId + periodoId + tipo + mes.',
      400
    );
  }
}

async function getConfigsEvaluacion(filters) {
  return prisma.configEvaluacion.findMany({
    where: buildWhere(filters),
    include: buildInclude(),
    orderBy: [{ id: 'desc' }]
  });
}

async function getConfigEvaluacionById(id) {
  const configId = parsePositiveInteger(id, 'id');
  const config = await prisma.configEvaluacion.findUnique({
    where: { id: configId },
    include: buildInclude()
  });

  if (!config) {
    throw createHttpError('ConfigEvaluacion no encontrada.', 404);
  }

  return config;
}

async function createConfigEvaluacion(payload, user) {
  const data = parsePayload(payload, false);
  await ensureReferences(data.cursoMateriaDocenteId, data.periodoId);
  await ensureUniqueCombination(data);

  const created = await prisma.configEvaluacion.create({
    data,
    include: buildInclude()
  });

  await auditLogger({
    usuario: `user:${user.id}`,
    tablaAfectada: 'ConfigEvaluacion',
    idRegistro: created.id,
    tipoOperacion: 'INSERT',
    valorAnterior: null,
    valorNuevo: created
  });

  return created;
}

async function updateConfigEvaluacion({ id, payload, user }) {
  const configId = parsePositiveInteger(id, 'id');
  const current = await prisma.configEvaluacion.findUnique({
    where: { id: configId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('ConfigEvaluacion no encontrada.', 404);
  }

  const data = parsePayload(payload, true);
  const finalData = {
    cursoMateriaDocenteId: data.cursoMateriaDocenteId ?? current.cursoMateriaDocenteId,
    periodoId: data.periodoId ?? current.periodoId,
    tipo: data.tipo ?? current.tipo,
    mes: data.mes !== undefined ? data.mes : current.mes
  };

  await ensureReferences(finalData.cursoMateriaDocenteId, finalData.periodoId);
  await ensureUniqueCombination(finalData, configId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.configEvaluacion.update({
      where: { id: configId },
      data,
      include: buildInclude()
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'ConfigEvaluacion',
      idRegistro: configId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteConfigEvaluacion({ id, user }) {
  const configId = parsePositiveInteger(id, 'id');
  const current = await prisma.configEvaluacion.findUnique({
    where: { id: configId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('ConfigEvaluacion no encontrada.', 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.configEvaluacion.delete({ where: { id: configId } });
    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'ConfigEvaluacion',
      idRegistro: configId,
      tipoOperacion: 'DELETE',
      valorAnterior: current,
      valorNuevo: null,
      prismaClient: tx
    });
  });
}

module.exports = {
  getConfigsEvaluacion,
  getConfigEvaluacionById,
  createConfigEvaluacion,
  updateConfigEvaluacion,
  deleteConfigEvaluacion
};

