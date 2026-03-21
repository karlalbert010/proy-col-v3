const prisma = require('../../config/prisma');
const auditLogger = require('../../utils/auditLogger');

const DURACIONES = ['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'ANUAL', 'OTRO'];
const ESTRATEGIAS = ['PROMEDIO', 'MAX_CON_RECUP', 'PONDERADO', 'ULTIMA_NOTA'];

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
  if (value === undefined || value === null || value === '') {
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

function parseEnum(value, fieldName, allowedValues) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!allowedValues.includes(normalized)) {
    throw createHttpError(`El campo ${fieldName} debe ser uno de: ${allowedValues.join(', ')}.`, 400);
  }
  return normalized;
}

async function ensureReferences({ anioLectivoId, cursoMateriaDocenteId }) {
  const anio = await prisma.anioLectivo.findUnique({ where: { id: anioLectivoId } });
  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  if (cursoMateriaDocenteId) {
    const cmd = await prisma.cursoMateriaDocente.findUnique({
      where: { id: cursoMateriaDocenteId },
      include: { curso: true, materiaAnual: true }
    });
    if (!cmd) {
      throw createHttpError('CursoMateriaDocente no encontrado.', 404);
    }
    if (cmd.curso.anioId !== anioLectivoId || cmd.materiaAnual.anioId !== anioLectivoId) {
      throw createHttpError(
        'CursoMateriaDocente debe pertenecer al mismo anio lectivo de la regla.',
        400
      );
    }
  }
}

function buildWhere(filters) {
  const where = {};

  if (filters.anioLectivoId !== undefined) {
    where.anioLectivoId = parsePositiveInteger(filters.anioLectivoId, 'anioLectivoId');
  }
  if (filters.cursoMateriaDocenteId !== undefined) {
    where.cursoMateriaDocenteId = parseNullablePositiveInteger(
      filters.cursoMateriaDocenteId,
      'cursoMateriaDocenteId'
    );
  }
  if (filters.duracion !== undefined && String(filters.duracion).trim() !== '') {
    where.duracion = parseEnum(filters.duracion, 'duracion', DURACIONES);
  }
  if (filters.activa !== undefined && String(filters.activa).trim() !== '') {
    where.activa = parseNullableBoolean(filters.activa, 'activa');
  }

  return where;
}

function buildInclude() {
  return {
    anioLectivo: true,
    cursoMateriaDocente: {
      include: {
        curso: true,
        materiaAnual: true
      }
    }
  };
}

function parseCreatePayload(payload) {
  const data = {
    anioLectivoId: parsePositiveInteger(payload.anioLectivoId, 'anioLectivoId'),
    cursoMateriaDocenteId: parseNullablePositiveInteger(
      payload.cursoMateriaDocenteId,
      'cursoMateriaDocenteId'
    ),
    duracion: parseEnum(payload.duracion, 'duracion', DURACIONES),
    estrategia: parseEnum(payload.estrategia, 'estrategia', ESTRATEGIAS),
    ponderacionRegular: parseNullableNumber(payload.ponderacionRegular, 'ponderacionRegular'),
    ponderacionRecuperatorio: parseNullableNumber(
      payload.ponderacionRecuperatorio,
      'ponderacionRecuperatorio'
    ),
    minAprobacion: parseNullableNumber(payload.minAprobacion, 'minAprobacion'),
    decimales: parseNullablePositiveInteger(payload.decimales, 'decimales'),
    activa: payload.activa === undefined ? true : parseNullableBoolean(payload.activa, 'activa'),
    observaciones:
      payload.observaciones === undefined || payload.observaciones === null
        ? null
        : String(payload.observaciones).trim()
  };

  return data;
}

function parseUpdatePayload(payload) {
  const data = {};

  if (payload.anioLectivoId !== undefined) {
    data.anioLectivoId = parsePositiveInteger(payload.anioLectivoId, 'anioLectivoId');
  }
  if (payload.cursoMateriaDocenteId !== undefined) {
    data.cursoMateriaDocenteId = parseNullablePositiveInteger(
      payload.cursoMateriaDocenteId,
      'cursoMateriaDocenteId'
    );
  }
  if (payload.duracion !== undefined) {
    data.duracion = parseEnum(payload.duracion, 'duracion', DURACIONES);
  }
  if (payload.estrategia !== undefined) {
    data.estrategia = parseEnum(payload.estrategia, 'estrategia', ESTRATEGIAS);
  }
  if (payload.ponderacionRegular !== undefined) {
    data.ponderacionRegular = parseNullableNumber(payload.ponderacionRegular, 'ponderacionRegular');
  }
  if (payload.ponderacionRecuperatorio !== undefined) {
    data.ponderacionRecuperatorio = parseNullableNumber(
      payload.ponderacionRecuperatorio,
      'ponderacionRecuperatorio'
    );
  }
  if (payload.minAprobacion !== undefined) {
    data.minAprobacion = parseNullableNumber(payload.minAprobacion, 'minAprobacion');
  }
  if (payload.decimales !== undefined) {
    data.decimales = parseNullablePositiveInteger(payload.decimales, 'decimales');
  }
  if (payload.activa !== undefined) {
    data.activa = parseNullableBoolean(payload.activa, 'activa');
  }
  if (payload.observaciones !== undefined) {
    data.observaciones =
      payload.observaciones === null ? null : String(payload.observaciones).trim();
  }

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  return data;
}

async function getReglasCalculo(filters) {
  return prisma.reglaCalculo.findMany({
    where: buildWhere(filters),
    include: buildInclude(),
    orderBy: [{ anioLectivoId: 'asc' }, { cursoMateriaDocenteId: 'asc' }, { id: 'desc' }]
  });
}

async function getReglaCalculoById(id) {
  const reglaId = parsePositiveInteger(id, 'id');
  const regla = await prisma.reglaCalculo.findUnique({
    where: { id: reglaId },
    include: buildInclude()
  });

  if (!regla) {
    throw createHttpError('Regla de calculo no encontrada.', 404);
  }

  return regla;
}

async function createReglaCalculo(payload, user) {
  const data = parseCreatePayload(payload);
  await ensureReferences(data);

  const created = await prisma.reglaCalculo.create({
    data,
    include: buildInclude()
  });

  await auditLogger({
    usuario: `user:${user.id}`,
    tablaAfectada: 'ReglaCalculo',
    idRegistro: created.id,
    tipoOperacion: 'INSERT',
    valorAnterior: null,
    valorNuevo: created
  });

  return created;
}

async function updateReglaCalculo({ id, payload, user }) {
  const reglaId = parsePositiveInteger(id, 'id');
  const current = await prisma.reglaCalculo.findUnique({
    where: { id: reglaId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('Regla de calculo no encontrada.', 404);
  }

  const data = parseUpdatePayload(payload);
  const refs = {
    anioLectivoId: data.anioLectivoId ?? current.anioLectivoId,
    cursoMateriaDocenteId: data.cursoMateriaDocenteId ?? current.cursoMateriaDocenteId
  };
  await ensureReferences(refs);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reglaCalculo.update({
      where: { id: reglaId },
      data,
      include: buildInclude()
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'ReglaCalculo',
      idRegistro: reglaId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteReglaCalculo({ id, user }) {
  const reglaId = parsePositiveInteger(id, 'id');
  const current = await prisma.reglaCalculo.findUnique({
    where: { id: reglaId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('Regla de calculo no encontrada.', 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.reglaCalculo.delete({ where: { id: reglaId } });
    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'ReglaCalculo',
      idRegistro: reglaId,
      tipoOperacion: 'DELETE',
      valorAnterior: current,
      valorNuevo: null,
      prismaClient: tx
    });
  });
}

module.exports = {
  getReglasCalculo,
  getReglaCalculoById,
  createReglaCalculo,
  updateReglaCalculo,
  deleteReglaCalculo
};

