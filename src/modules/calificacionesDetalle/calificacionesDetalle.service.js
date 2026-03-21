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

function parseNullableNumber(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createHttpError(`El campo ${fieldName} debe ser numerico.`, 400);
  }

  return parsed;
}

function parseNullableText(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return String(value).trim();
}

function buildInclude() {
  return {
    calificacion: {
      include: {
        matricula: {
          include: {
            alumno: true,
            curso: {
              include: { anio: true }
            }
          }
        },
        materiaAnual: {
          include: {
            materia: true,
            anio: true
          }
        },
        periodo: {
          include: {
            anio: true
          }
        }
      }
    }
  };
}

function buildDetalleData(payload) {
  const data = {
    notaOrint1erTrim: parseNullableNumber(payload.notaOrint1erTrim, 'notaOrint1erTrim'),
    nota1erTrimMes1: parseNullableNumber(payload.nota1erTrimMes1, 'nota1erTrimMes1'),
    nota1erTrimMes2: parseNullableNumber(payload.nota1erTrimMes2, 'nota1erTrimMes2'),
    nota1erTrimMes3: parseNullableNumber(payload.nota1erTrimMes3, 'nota1erTrimMes3'),
    recup1erTrim: parseNullableNumber(payload.recup1erTrim, 'recup1erTrim'),
    observ1erTrim: parseNullableText(payload.observ1erTrim),
    notaOrint2doTrim: parseNullableNumber(payload.notaOrint2doTrim, 'notaOrint2doTrim'),
    nota2doTrimMes1: parseNullableNumber(payload.nota2doTrimMes1, 'nota2doTrimMes1'),
    nota2doTrimMes2: parseNullableNumber(payload.nota2doTrimMes2, 'nota2doTrimMes2'),
    nota2doTrimMes3: parseNullableNumber(payload.nota2doTrimMes3, 'nota2doTrimMes3'),
    recup2doTrim: parseNullableNumber(payload.recup2doTrim, 'recup2doTrim'),
    observ2doTrim: parseNullableText(payload.observ2doTrim),
    notaOrint3erTrim: parseNullableNumber(payload.notaOrint3erTrim, 'notaOrint3erTrim'),
    nota3erTrimMes1: parseNullableNumber(payload.nota3erTrimMes1, 'nota3erTrimMes1'),
    nota3erTrimMes2: parseNullableNumber(payload.nota3erTrimMes2, 'nota3erTrimMes2'),
    nota3erTrimMes3: parseNullableNumber(payload.nota3erTrimMes3, 'nota3erTrimMes3'),
    recup3erTrim: parseNullableNumber(payload.recup3erTrim, 'recup3erTrim'),
    observ3erTrim: parseNullableText(payload.observ3erTrim),
    acompDic: parseNullableText(payload.acompDic),
    acompFeb: parseNullableText(payload.acompFeb),
    alumConAcomp: parseNullableText(payload.alumConAcomp)
  };

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

async function getCalificacionesDetalle({ calificacionId }) {
  const where = {};

  if (calificacionId !== undefined && calificacionId !== null && calificacionId !== '') {
    where.calificacionId = parsePositiveInteger(calificacionId, 'calificacionId');
  }

  return prisma.calificacionDetalle.findMany({
    where,
    include: buildInclude(),
    orderBy: [{ id: 'desc' }]
  });
}

async function getCalificacionDetalleById(id) {
  const detalleId = parsePositiveInteger(id, 'id');

  const detalle = await prisma.calificacionDetalle.findUnique({
    where: { id: detalleId },
    include: buildInclude()
  });

  if (!detalle) {
    throw createHttpError('CalificacionDetalle no encontrado.', 404);
  }

  return detalle;
}

async function createCalificacionDetalle(payload) {
  const calificacionId = parsePositiveInteger(payload.calificacionId, 'calificacionId');
  const data = buildDetalleData(payload);

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe informar al menos un campo de detalle para crear.', 400);
  }

  const [calificacion, existing] = await Promise.all([
    prisma.calificacion.findUnique({ where: { id: calificacionId } }),
    prisma.calificacionDetalle.findUnique({ where: { calificacionId } })
  ]);

  if (!calificacion) {
    throw createHttpError('Calificacion no encontrada.', 404);
  }

  if (existing) {
    throw createHttpError('Ya existe detalle para la calificacion indicada.', 400);
  }

  return prisma.calificacionDetalle.create({
    data: {
      calificacionId,
      ...data
    },
    include: buildInclude()
  });
}

async function updateCalificacionDetalle({ id, payload, user }) {
  const detalleId = parsePositiveInteger(id, 'id');
  const data = buildDetalleData(payload);

  if (Object.keys(data).length === 0) {
    throw createHttpError('Debe informar al menos un campo para actualizar.', 400);
  }

  const current = await prisma.calificacionDetalle.findUnique({
    where: { id: detalleId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('CalificacionDetalle no encontrado.', 404);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.calificacionDetalle.update({
      where: { id: detalleId },
      data,
      include: buildInclude()
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'CalificacionDetalle',
      idRegistro: detalleId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteCalificacionDetalle({ id, user }) {
  const detalleId = parsePositiveInteger(id, 'id');

  const current = await prisma.calificacionDetalle.findUnique({
    where: { id: detalleId },
    include: buildInclude()
  });

  if (!current) {
    throw createHttpError('CalificacionDetalle no encontrado.', 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.calificacionDetalle.delete({
      where: { id: detalleId }
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'CalificacionDetalle',
      idRegistro: detalleId,
      tipoOperacion: 'DELETE',
      valorAnterior: current,
      valorNuevo: null,
      prismaClient: tx
    });
  });
}

function normalizeComparableValue(value) {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }
  const text = String(value).trim();
  if (text === '') {
    return null;
  }
  const asNumber = Number(text.replace(',', '.'));
  if (Number.isFinite(asNumber)) {
    return Number(asNumber.toFixed(2));
  }
  return text;
}

async function compareCalificacionWithView(calificacionIdValue) {
  const calificacionId = parsePositiveInteger(calificacionIdValue, 'calificacionId');

  const [base, rows] = await Promise.all([
    prisma.calificacion.findUnique({
      where: { id: calificacionId },
      include: {
        detalle: true,
        matricula: {
          include: {
            alumno: true,
            curso: true
          }
        },
        materiaAnual: true,
        periodo: true
      }
    }),
    prisma.$queryRawUnsafe(
      'SELECT * FROM vw_notas_1a_primer_trimestre WHERE calificacionId = ?',
      calificacionId
    )
  ]);

  if (!base) {
    throw createHttpError('Calificacion no encontrada.', 404);
  }

  if (!rows || rows.length === 0) {
    return {
      comparable: false,
      message: 'La calificacion no existe en vw_notas_1a_primer_trimestre (fuera de 1A/1er trimestre o sin fila en view).',
      calificacionId,
      contexto: {
        alumnoId: base.matricula.alumnoId,
        alumno: `${base.matricula.alumno.apellido}, ${base.matricula.alumno.nombre}`,
        curso: base.matricula.curso.nombre,
        materia: base.materiaAnual.nombre,
        periodoOrden: base.periodo.orden
      }
    };
  }

  const row = rows[0];
  const detalle = base.detalle || {};

  const compareMap = [
    {
      field: 'nota1erTrimMes1',
      baseValue: detalle.nota1erTrimMes1,
      viewValue: row.nota1erTrimMes1
    },
    {
      field: 'nota1erTrimMes2',
      baseValue: detalle.nota1erTrimMes2,
      viewValue: row.nota1erTrimMes2
    },
    {
      field: 'nota1erTrimMes3',
      baseValue: detalle.nota1erTrimMes3,
      viewValue: row.nota1erTrimMes3
    },
    {
      field: 'recup1erTrim',
      baseValue: detalle.recup1erTrim,
      viewValue: row.recup1erTrim
    },
    {
      field: 'notaTrimestralFinal',
      baseValue: base.nota,
      viewValue: row.notaTrimestralFinal
    }
  ];

  const diffs = compareMap
    .map((x) => {
      const baseNorm = normalizeComparableValue(x.baseValue);
      const viewNorm = normalizeComparableValue(x.viewValue);
      return {
        field: x.field,
        base: baseNorm,
        view: viewNorm,
        match: baseNorm === viewNorm
      };
    })
    .filter((x) => !x.match);

  return {
    comparable: true,
    calificacionId,
    contexto: {
      alumnoId: base.matricula.alumnoId,
      alumno: `${base.matricula.alumno.apellido}, ${base.matricula.alumno.nombre}`,
      curso: base.matricula.curso.nombre,
      materia: base.materiaAnual.nombre,
      periodoOrden: base.periodo.orden
    },
    allFields: compareMap.map((x) => ({
      field: x.field,
      base: normalizeComparableValue(x.baseValue),
      view: normalizeComparableValue(x.viewValue)
    })),
    match: diffs.length === 0,
    differences: diffs
  };
}

function parseOptionalTrimmedText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === '' ? null : text;
}

function parseOptionalTrimestre(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const trimestre = Number(value);
  if (!Number.isInteger(trimestre) || trimestre < 1 || trimestre > 3) {
    throw createHttpError('El parametro trimestre debe ser 1, 2 o 3.', 400);
  }

  return trimestre;
}

function parseLimit(value) {
  if (value === undefined || value === null || value === '') {
    return 300;
  }

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw createHttpError('El parametro limit debe ser entero positivo.', 400);
  }

  return Math.min(limit, 1000);
}

async function getCalificacionesTrimestralesView({ trimestre, curso, materia, alumno, limit }) {
  const trimestreValue = parseOptionalTrimestre(trimestre);
  const cursoValue = parseOptionalTrimmedText(curso);
  const materiaValue = parseOptionalTrimmedText(materia);
  const alumnoValue = parseOptionalTrimmedText(alumno);
  const limitValue = parseLimit(limit);

  let sql = `
    SELECT
      trimestre,
      anioLectivo,
      Curso,
      Apellidos,
      Nombres,
      Materia,
      notaOrientadora,
      notaMes1,
      notaMes2,
      notaMes3,
      promTrimestre,
      recuperatorio,
      notaFinalTrimestre
    FROM vw_calificaciones_trimestrales_operativa
    WHERE 1=1
  `;

  const params = [];

  if (trimestreValue !== null) {
    sql += ' AND trimestre = ?';
    params.push(trimestreValue);
  }

  if (cursoValue !== null) {
    sql += ' AND Curso = ?';
    params.push(cursoValue);
  }

  if (materiaValue !== null) {
    sql += ' AND Materia = ?';
    params.push(materiaValue);
  }

  if (alumnoValue !== null) {
    sql += " AND CONCAT(Apellidos, ' ', Nombres) LIKE ?";
    params.push(`%${alumnoValue}%`);
  }

  sql += ' ORDER BY trimestre DESC, Curso DESC, Apellidos DESC, Nombres DESC, Materia DESC LIMIT ?';
  params.push(limitValue);

  const rows = await prisma.$queryRawUnsafe(sql, ...params);
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value])
    )
  );
}

module.exports = {
  getCalificacionesDetalle,
  getCalificacionDetalleById,
  createCalificacionDetalle,
  updateCalificacionDetalle,
  deleteCalificacionDetalle,
  compareCalificacionWithView,
  getCalificacionesTrimestralesView
};
