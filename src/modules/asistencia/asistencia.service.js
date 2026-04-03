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
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  throw createHttpError(`El campo ${fieldName} debe ser booleano.`, 400);
}

function parseDateOnly(value, fieldName) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw createHttpError(`El campo ${fieldName} es obligatorio.`, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createHttpError(`El campo ${fieldName} debe tener formato YYYY-MM-DD.`, 400);
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`El campo ${fieldName} es invalido.`, 400);
  }
  return raw;
}

function parseOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return parsePositiveInteger(value, fieldName);
}

function buildDateRange(rawDate) {
  const start = new Date(`${rawDate}T00:00:00.000Z`);
  const end = new Date(`${rawDate}T23:59:59.999Z`);
  const writeDate = start;
  return { start, end, writeDate };
}

function includeMatricula() {
  return {
    alumno: true,
    curso: {
      include: {
        anio: true
      }
    }
  };
}

async function getContexto({ anio, cursoId, fecha }) {
  const parsedAnio = parseOptionalPositiveInteger(anio, 'anio');
  const parsedFecha = parseDateOnly(fecha, 'fecha');
  const range = buildDateRange(parsedFecha);

  const cursoRaw = String(cursoId || '').trim();
  if (!cursoRaw) {
    throw createHttpError('El campo cursoId es obligatorio.', 400);
  }

  const parsedCursoId = Number(cursoRaw);
  const cursoWhere = Number.isInteger(parsedCursoId) && parsedCursoId > 0
    ? { id: parsedCursoId }
    : { nombre: cursoRaw };

  const curso = await prisma.curso.findFirst({
    where: cursoWhere,
    include: { anio: true }
  });

  if (!curso) {
    throw createHttpError('Curso no encontrado.', 404);
  }

  if (parsedAnio && curso.anio.anio !== parsedAnio) {
    throw createHttpError('Curso no encontrado para el anio seleccionado.', 404);
  }

  const matriculas = await prisma.matricula.findMany({
    where: { cursoId: curso.id },
    include: includeMatricula(),
    orderBy: [{ alumno: { apellido: 'asc' } }, { alumno: { nombre: 'asc' } }]
  });

  const asistenciaRows = await prisma.asistencia.findMany({
    where: {
      matriculaId: { in: matriculas.map((m) => m.id) },
      fecha: {
        gte: range.start,
        lte: range.end
      }
    }
  });

  const asistenciaByMatricula = new Map(asistenciaRows.map((r) => [r.matriculaId, r]));
  const alumnos = matriculas.map((m) => {
    const row = asistenciaByMatricula.get(m.id);
    return {
      matriculaId: m.id,
      alumnoId: m.alumnoId,
      apellido: m.alumno.apellido,
      nombre: m.alumno.nombre,
      dni: m.alumno.dni,
      presente: row ? row.presente : true,
      observacion: row ? row.observacion : null
    };
  });

  return {
    anio: curso.anio.anio,
    curso: { id: curso.id, nombre: curso.nombre },
    fecha: String(fecha),
    alumnos
  };
}

async function guardarAsistencia({ payload, user }) {
  const cursoRaw = String(payload.cursoId || '').trim();
  if (!cursoRaw) {
    throw createHttpError('El campo cursoId es obligatorio.', 400);
  }

  const parsedCursoId = Number(cursoRaw);
  const fecha = parseDateOnly(payload.fecha, 'fecha');
  const range = buildDateRange(fecha);
  const todosPresentes = payload.todosPresentes === undefined ? false : parseBoolean(payload.todosPresentes, 'todosPresentes');

  const cursoWhere = Number.isInteger(parsedCursoId) && parsedCursoId > 0
    ? { id: parsedCursoId }
    : { nombre: cursoRaw };
  const curso = await prisma.curso.findFirst({ where: cursoWhere });
  if (!curso) {
    throw createHttpError('Curso no encontrado.', 404);
  }
  const cursoId = curso.id;

  const matriculasCurso = await prisma.matricula.findMany({ where: { cursoId } });
  const matriculaIds = new Set(matriculasCurso.map((m) => m.id));

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!todosPresentes && items.length === 0) {
    throw createHttpError('Debe informar items o activar todosPresentes.', 400);
  }

  const normalized = todosPresentes
    ? matriculasCurso.map((m) => ({ matriculaId: m.id, presente: true, observacion: null }))
    : items.map((x) => ({
        matriculaId: parsePositiveInteger(x.matriculaId, 'items.matriculaId'),
        presente: parseBoolean(x.presente, 'items.presente'),
        observacion:
          x.observacion === undefined || x.observacion === null ? null : String(x.observacion).trim()
      }));

  for (const row of normalized) {
    if (!matriculaIds.has(row.matriculaId)) {
      throw createHttpError(`La matricula ${row.matriculaId} no pertenece al curso seleccionado.`, 400);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const row of normalized) {
      const existing = await tx.asistencia.findFirst({
        where: {
          matriculaId: row.matriculaId,
          fecha: {
            gte: range.start,
            lte: range.end
          }
        },
        select: { id: true }
      });

      if (existing) {
        await tx.asistencia.update({
          where: { id: existing.id },
          data: {
            presente: row.presente,
            observacion: row.observacion
          }
        });
      } else {
        await tx.asistencia.create({
          data: {
            matriculaId: row.matriculaId,
            fecha: range.writeDate,
            presente: row.presente,
            observacion: row.observacion
          }
        });
      }
    }

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Asistencia',
      idRegistro: cursoId,
      tipoOperacion: 'UPDATE',
      valorAnterior: null,
      valorNuevo: {
        fecha: payload.fecha,
        cursoId,
        cantidad: normalized.length,
        todosPresentes
      },
      prismaClient: tx
    });
  });

  return {
    cursoId,
    fecha: payload.fecha,
    cantidad: normalized.length,
    todosPresentes
  };
}

module.exports = {
  getContexto,
  guardarAsistencia
};

