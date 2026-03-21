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

function parseOptionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseNota(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw createHttpError('El campo nota debe ser numerico.', 400);
  }

  return parsed;
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function parseNumberFromText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalized = text.replace(',', '.');
  const direct = Number(normalized);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFecha(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError('El campo fecha debe tener formato de fecha valido.', 400);
  }

  return date;
}

function normalizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function validateSqlIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_]+$/.test(value)) {
    throw createHttpError(`El campo ${fieldName} contiene caracteres invalidos.`, 400);
  }

  return value;
}

function buildCalificacionInclude() {
  return {
    matricula: {
      include: {
        alumno: true,
        curso: {
          include: {
            anio: true
          }
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
    },
    detalle: true
  };
}

function buildDetalleFromPayload(payload) {
  const data = {};

  if (payload.notaOrint1erTrim !== undefined) {
    data.notaOrint1erTrim = parseNullableNumber(payload.notaOrint1erTrim);
  }
  if (payload.nota1erTrimMes1 !== undefined) {
    data.nota1erTrimMes1 = parseNullableNumber(payload.nota1erTrimMes1);
  }
  if (payload.nota1erTrimMes2 !== undefined) {
    data.nota1erTrimMes2 = parseNullableNumber(payload.nota1erTrimMes2);
  }
  if (payload.nota1erTrimMes3 !== undefined) {
    data.nota1erTrimMes3 = parseNullableNumber(payload.nota1erTrimMes3);
  }
  if (payload.recup1erTrim !== undefined) {
    data.recup1erTrim = parseNullableNumber(payload.recup1erTrim);
  }
  if (payload.observ1erTrim !== undefined) {
    data.observ1erTrim = payload.observ1erTrim === null ? null : String(payload.observ1erTrim).trim();
  }

  if (payload.notaOrint2doTrim !== undefined) {
    data.notaOrint2doTrim = parseNullableNumber(payload.notaOrint2doTrim);
  }
  if (payload.nota2doTrimMes1 !== undefined) {
    data.nota2doTrimMes1 = parseNullableNumber(payload.nota2doTrimMes1);
  }
  if (payload.nota2doTrimMes2 !== undefined) {
    data.nota2doTrimMes2 = parseNullableNumber(payload.nota2doTrimMes2);
  }
  if (payload.nota2doTrimMes3 !== undefined) {
    data.nota2doTrimMes3 = parseNullableNumber(payload.nota2doTrimMes3);
  }
  if (payload.recup2doTrim !== undefined) {
    data.recup2doTrim = parseNullableNumber(payload.recup2doTrim);
  }
  if (payload.observ2doTrim !== undefined) {
    data.observ2doTrim = payload.observ2doTrim === null ? null : String(payload.observ2doTrim).trim();
  }

  if (payload.notaOrint3erTrim !== undefined) {
    data.notaOrint3erTrim = parseNullableNumber(payload.notaOrint3erTrim);
  }
  if (payload.nota3erTrimMes1 !== undefined) {
    data.nota3erTrimMes1 = parseNullableNumber(payload.nota3erTrimMes1);
  }
  if (payload.nota3erTrimMes2 !== undefined) {
    data.nota3erTrimMes2 = parseNullableNumber(payload.nota3erTrimMes2);
  }
  if (payload.nota3erTrimMes3 !== undefined) {
    data.nota3erTrimMes3 = parseNullableNumber(payload.nota3erTrimMes3);
  }
  if (payload.recup3erTrim !== undefined) {
    data.recup3erTrim = parseNullableNumber(payload.recup3erTrim);
  }
  if (payload.observ3erTrim !== undefined) {
    data.observ3erTrim = payload.observ3erTrim === null ? null : String(payload.observ3erTrim).trim();
  }

  if (payload.acompDic !== undefined) {
    data.acompDic = payload.acompDic === null ? null : String(payload.acompDic).trim();
  }
  if (payload.acompFeb !== undefined) {
    data.acompFeb = payload.acompFeb === null ? null : String(payload.acompFeb).trim();
  }
  if (payload.alumConAcomp !== undefined) {
    data.alumConAcomp = payload.alumConAcomp === null ? null : String(payload.alumConAcomp).trim();
  }

  return data;
}

function calculateTrimestral(detalle, fallbackNota = null, orden = null) {
  if (!detalle) {
    return fallbackNota;
  }

  let notaMes1 = null;
  let notaMes2 = null;
  let notaMes3 = null;
  let recuperatorio = null;

  if (orden === 1) {
    notaMes1 = detalle.nota1erTrimMes1;
    notaMes2 = detalle.nota1erTrimMes2;
    notaMes3 = detalle.nota1erTrimMes3;
    recuperatorio = detalle.recup1erTrim;
  } else if (orden === 2) {
    notaMes1 = detalle.nota2doTrimMes1;
    notaMes2 = detalle.nota2doTrimMes2;
    notaMes3 = detalle.nota2doTrimMes3;
    recuperatorio = detalle.recup2doTrim;
  } else if (orden === 3) {
    notaMes1 = detalle.nota3erTrimMes1;
    notaMes2 = detalle.nota3erTrimMes2;
    notaMes3 = detalle.nota3erTrimMes3;
    recuperatorio = detalle.recup3erTrim;
  }

  const notasMes = [notaMes1, notaMes2, notaMes3].filter((x) => Number.isFinite(x));
  const promedioMeses = notasMes.length ? notasMes.reduce((acc, n) => acc + n, 0) / notasMes.length : null;

  if (Number.isFinite(recuperatorio) && Number.isFinite(promedioMeses)) {
    return Number(Math.max(recuperatorio, promedioMeses).toFixed(2));
  }

  if (Number.isFinite(recuperatorio)) {
    return Number(recuperatorio.toFixed(2));
  }

  if (Number.isFinite(promedioMeses)) {
    return Number(promedioMeses.toFixed(2));
  }

  return fallbackNota;
}

function roundByDecimals(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const safeDecimals = Number.isInteger(decimals) && decimals >= 0 ? decimals : 2;
  return Number(value.toFixed(safeDecimals));
}

function applyEstrategiaCalculo(baseValue, recoveryValue, regla = null) {
  const estrategia = regla?.estrategia || 'MAX_CON_RECUP';
  const decimales = regla?.decimales ?? 2;

  const base = Number.isFinite(baseValue) ? baseValue : null;
  const rec = Number.isFinite(recoveryValue) ? recoveryValue : null;

  if (estrategia === 'PROMEDIO') {
    if (base !== null) {
      return roundByDecimals(base, decimales);
    }
    return rec !== null ? roundByDecimals(rec, decimales) : null;
  }

  if (estrategia === 'ULTIMA_NOTA') {
    if (rec !== null) {
      return roundByDecimals(rec, decimales);
    }
    return base !== null ? roundByDecimals(base, decimales) : null;
  }

  if (estrategia === 'PONDERADO') {
    if (base !== null && rec !== null) {
      const wBase = Number.isFinite(regla?.ponderacionRegular) ? regla.ponderacionRegular : 1;
      const wRec = Number.isFinite(regla?.ponderacionRecuperatorio)
        ? regla.ponderacionRecuperatorio
        : 1;
      const total = wBase + wRec;
      if (total > 0) {
        return roundByDecimals((base * wBase + rec * wRec) / total, decimales);
      }
    }
    if (base !== null) {
      return roundByDecimals(base, decimales);
    }
    return rec !== null ? roundByDecimals(rec, decimales) : null;
  }

  if (base !== null && rec !== null) {
    return roundByDecimals(Math.max(base, rec), decimales);
  }
  if (base !== null) {
    return roundByDecimals(base, decimales);
  }
  return rec !== null ? roundByDecimals(rec, decimales) : null;
}

async function resolveReglasCalculoForResumen(groups) {
  if (groups.length === 0) {
    return new Map();
  }

  const anioIds = [...new Set(groups.map((g) => g?.curso?.anioId).filter((x) => Number.isInteger(x)))];
  if (anioIds.length === 0) {
    return new Map();
  }

  const pairMap = new Map();
  for (const group of groups) {
    if (!Number.isInteger(group?.curso?.id) || !Number.isInteger(group?.materiaAnual?.id)) {
      continue;
    }
    pairMap.set(`${group.curso.id}|${group.materiaAnual.id}`, {
      cursoId: group.curso.id,
      materiaAnualId: group.materiaAnual.id
    });
  }

  const pairs = [...pairMap.values()];
  const asignaciones = pairs.length
    ? await prisma.cursoMateriaDocente.findMany({
        where: {
          activo: true,
          OR: pairs.map((pair) => ({
            cursoId: pair.cursoId,
            materiaAnualId: pair.materiaAnualId
          }))
        }
      })
    : [];

  const cmdByPair = new Map(
    asignaciones.map((a) => [`${a.cursoId}|${a.materiaAnualId}`, a.id])
  );

  const cmdIds = [...new Set(asignaciones.map((a) => a.id))];

  const [reglasGlobales, reglasEspecificas] = await Promise.all([
    prisma.reglaCalculo.findMany({
      where: {
        activa: true,
        anioLectivoId: { in: anioIds },
        cursoMateriaDocenteId: null
      },
      orderBy: { id: 'desc' }
    }),
    cmdIds.length
      ? prisma.reglaCalculo.findMany({
          where: {
            activa: true,
            cursoMateriaDocenteId: { in: cmdIds }
          },
          orderBy: { id: 'desc' }
        })
      : []
  ]);

  const globalByAnio = new Map();
  for (const regla of reglasGlobales) {
    if (!globalByAnio.has(regla.anioLectivoId)) {
      globalByAnio.set(regla.anioLectivoId, regla);
    }
  }

  const especificaByCmd = new Map();
  for (const regla of reglasEspecificas) {
    if (!especificaByCmd.has(regla.cursoMateriaDocenteId)) {
      especificaByCmd.set(regla.cursoMateriaDocenteId, regla);
    }
  }

  const reglasByGroupKey = new Map();

  for (const group of groups) {
    const key = `${group.matriculaId}|${group.materiaAnualId}`;
    const pairKey = `${group?.curso?.id}|${group?.materiaAnual?.id}`;
    const cmdId = cmdByPair.get(pairKey);
    const reglaEspecifica = cmdId ? especificaByCmd.get(cmdId) : null;
    const reglaGlobal = globalByAnio.get(group?.curso?.anioId);
    reglasByGroupKey.set(key, reglaEspecifica || reglaGlobal || null);
  }

  return reglasByGroupKey;
}

function resolveRecuperacionAnual(group) {
  const periodos = Object.values(group.periodos || {});

  // Priorizamos febrero sobre diciembre, porque suele ser instancia posterior.
  const febValues = periodos
    .map((p) => parseNumberFromText(p?.detalle?.acompFeb))
    .filter((x) => Number.isFinite(x));
  if (febValues.length > 0) {
    return Number(febValues[0].toFixed(2));
  }

  const dicValues = periodos
    .map((p) => parseNumberFromText(p?.detalle?.acompDic))
    .filter((x) => Number.isFinite(x));
  if (dicValues.length > 0) {
    return Number(dicValues[0].toFixed(2));
  }

  return null;
}

function buildFilters({ anio, curso, alumno, materia }) {
  const and = [];

  if (anio !== undefined) {
    const anioValue = Number(anio);

    if (!Number.isInteger(anioValue)) {
      throw createHttpError('El filtro anio debe ser numerico.', 400);
    }

    and.push({
      matricula: {
        curso: {
          anio: {
            anio: anioValue
          }
        }
      }
    });
  }

  if (curso !== undefined && String(curso).trim()) {
    const cursoId = parseOptionalPositiveInteger(curso);

    if (cursoId) {
      and.push({
        matricula: {
          cursoId
        }
      });
    } else {
      and.push({
        matricula: {
          curso: {
            nombre: {
              contains: String(curso).trim()
            }
          }
        }
      });
    }
  }

  if (alumno !== undefined && String(alumno).trim()) {
    const value = String(alumno).trim();
    const alumnoId = parseOptionalPositiveInteger(value);

    if (alumnoId) {
      and.push({
        matricula: {
          alumnoId
        }
      });
    } else {
      and.push({
        OR: [
          {
            matricula: {
              alumno: {
                dni: {
                  contains: value
                }
              }
            }
          },
          {
            matricula: {
              alumno: {
                apellido: {
                  contains: value
                }
              }
            }
          },
          {
            matricula: {
              alumno: {
                nombre: {
                  contains: value
                }
              }
            }
          }
        ]
      });
    }
  }

  if (materia !== undefined && String(materia).trim()) {
    const value = String(materia).trim();
    const materiaId = parseOptionalPositiveInteger(value);

    if (materiaId) {
      and.push({
        materiaAnual: {
          materiaId
        }
      });
    } else {
      and.push({
        OR: [
          {
            materiaAnual: {
              nombre: {
                contains: value
              }
            }
          },
          {
            materiaAnual: {
              materia: {
                codigoBase: {
                  contains: value
                }
              }
            }
          },
          {
            materiaAnual: {
              materia: {
                descripcion: {
                  contains: value
                }
              }
            }
          }
        ]
      });
    }
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
}

async function resolveCreateReferences({ matriculaId, materiaAnualId, periodoId }) {
  const [matricula, materiaAnual, periodo] = await Promise.all([
    prisma.matricula.findUnique({
      where: { id: matriculaId },
      include: { curso: true }
    }),
    prisma.materiaAnual.findUnique({ where: { id: materiaAnualId } }),
    prisma.periodo.findUnique({ where: { id: periodoId } })
  ]);

  if (!matricula) {
    throw createHttpError('Matricula no encontrada.', 404);
  }

  if (!materiaAnual) {
    throw createHttpError('Materia anual no encontrada.', 404);
  }

  if (!periodo) {
    throw createHttpError('Periodo no encontrado.', 404);
  }

  const anioIds = [matricula.curso.anioId, materiaAnual.anioId, periodo.anioId];
  const anioId = anioIds[0];

  if (!anioIds.every((id) => id === anioId)) {
    throw createHttpError(
      'La matricula, materia anual y periodo deben pertenecer al mismo anio lectivo.',
      400
    );
  }

  return {
    anioId,
    matricula,
    materiaAnual,
    periodo
  };
}

async function ensureAnioActivo(anioId) {
  const anio = await prisma.anioLectivo.findUnique({ where: { id: anioId } });

  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  if (anio.estado !== 'ACTIVO') {
    throw createHttpError('Solo se permite cargar/modificar calificaciones cuando el anio esta ACTIVO.', 403);
  }
}

async function ensureNoDuplicateCombination({ matriculaId, materiaAnualId, periodoId, excludeId = null }) {
  const duplicated = await prisma.calificacion.findFirst({
    where: {
      matriculaId,
      materiaAnualId,
      periodoId,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  });

  if (duplicated) {
    throw createHttpError(
      'No se puede duplicar la combinacion matriculaId + materiaAnualId + periodoId.',
      400
    );
  }
}

async function upsertDetalle(tx, calificacionId, payloadDetalle) {
  const detalleData = buildDetalleFromPayload(payloadDetalle);
  if (Object.keys(detalleData).length === 0) {
    return null;
  }

  return tx.calificacionDetalle.upsert({
    where: { calificacionId },
    create: {
      calificacionId,
      ...detalleData
    },
    update: detalleData
  });
}

async function getCalificaciones(filters) {
  const where = buildFilters(filters);

  return prisma.calificacion.findMany({
    where,
    include: buildCalificacionInclude(),
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }]
  });
}

async function getCalificacionById(id) {
  const calificacionId = parsePositiveInteger(id, 'id');

  const calificacion = await prisma.calificacion.findUnique({
    where: { id: calificacionId },
    include: buildCalificacionInclude()
  });

  if (!calificacion) {
    throw createHttpError('Calificacion no encontrada.', 404);
  }

  return calificacion;
}

async function createCalificacion(payload) {
  const matriculaId = parsePositiveInteger(payload.matriculaId, 'matriculaId');
  const materiaAnualId = parsePositiveInteger(payload.materiaAnualId, 'materiaAnualId');
  const periodoId = parsePositiveInteger(payload.periodoId, 'periodoId');
  const nota = parseNota(payload.nota);
  const fecha = parseFecha(payload.fecha);

  const refs = await resolveCreateReferences({
    matriculaId,
    materiaAnualId,
    periodoId
  });

  await ensureAnioActivo(refs.anioId);
  await ensureNoDuplicateCombination({ matriculaId, materiaAnualId, periodoId });

  return prisma.$transaction(async (tx) => {
    const created = await tx.calificacion.create({
      data: {
        matriculaId,
        materiaAnualId,
        periodoId,
        nota,
        fecha
      }
    });

    await upsertDetalle(tx, created.id, payload);

    return tx.calificacion.findUnique({
      where: { id: created.id },
      include: buildCalificacionInclude()
    });
  });
}

async function updateCalificacion({ id, payload, user }) {
  const calificacionId = parsePositiveInteger(id, 'id');

  const current = await prisma.calificacion.findUnique({
    where: { id: calificacionId },
    include: buildCalificacionInclude()
  });

  if (!current) {
    throw createHttpError('Calificacion no encontrada.', 404);
  }

  const data = {};

  if (payload.matriculaId !== undefined) {
    data.matriculaId = parsePositiveInteger(payload.matriculaId, 'matriculaId');
  }
  if (payload.materiaAnualId !== undefined) {
    data.materiaAnualId = parsePositiveInteger(payload.materiaAnualId, 'materiaAnualId');
  }
  if (payload.periodoId !== undefined) {
    data.periodoId = parsePositiveInteger(payload.periodoId, 'periodoId');
  }
  if (payload.nota !== undefined) {
    data.nota = parseNota(payload.nota);
  }
  if (payload.fecha !== undefined) {
    data.fecha = parseFecha(payload.fecha);
  }

  const detalleData = buildDetalleFromPayload(payload);
  const hasDetalleUpdate = Object.keys(detalleData).length > 0;

  if (Object.keys(data).length === 0 && !hasDetalleUpdate) {
    throw createHttpError('Debe enviar al menos un campo para actualizar.', 400);
  }

  const finalIds = {
    matriculaId: data.matriculaId ?? current.matriculaId,
    materiaAnualId: data.materiaAnualId ?? current.materiaAnualId,
    periodoId: data.periodoId ?? current.periodoId
  };

  const refs = await resolveCreateReferences(finalIds);

  await ensureAnioActivo(refs.anioId);
  await ensureNoDuplicateCombination({ ...finalIds, excludeId: calificacionId });

  return prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.calificacion.update({
        where: { id: calificacionId },
        data
      });
    }

    if (hasDetalleUpdate) {
      await upsertDetalle(tx, calificacionId, payload);
    }

    const updated = await tx.calificacion.findUnique({
      where: { id: calificacionId },
      include: buildCalificacionInclude()
    });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Calificacion',
      idRegistro: calificacionId,
      tipoOperacion: 'UPDATE',
      valorAnterior: current,
      valorNuevo: updated,
      prismaClient: tx
    });

    return updated;
  });
}

async function deleteCalificacion({ id, user }) {
  const calificacionId = parsePositiveInteger(id, 'id');

  const current = await prisma.calificacion.findUnique({
    where: { id: calificacionId },
    include: buildCalificacionInclude()
  });

  if (!current) {
    throw createHttpError('Calificacion no encontrada.', 404);
  }

  const anioId = current.periodo.anioId;
  await ensureAnioActivo(anioId);

  return prisma.$transaction(async (tx) => {
    await tx.calificacion.delete({ where: { id: calificacionId } });

    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Calificacion',
      idRegistro: calificacionId,
      tipoOperacion: 'DELETE',
      valorAnterior: current,
      valorNuevo: null,
      prismaClient: tx
    });
  });
}

async function getCalificacionesResumen(filters) {
  const where = buildFilters(filters);
  const data = await prisma.calificacion.findMany({
    where,
    include: buildCalificacionInclude(),
    orderBy: [{ matriculaId: 'asc' }, { materiaAnualId: 'asc' }, { periodo: { orden: 'asc' } }]
  });

  const grouped = new Map();

  for (const row of data) {
    const key = `${row.matriculaId}|${row.materiaAnualId}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        matriculaId: row.matriculaId,
        materiaAnualId: row.materiaAnualId,
        alumno: row.matricula.alumno,
        curso: row.matricula.curso,
        materiaAnual: row.materiaAnual,
        periodos: {},
        promedioAnual: null,
        recuperacionAnual: null,
        notaAnualFinal: null
      });
    }

    const current = grouped.get(key);
    const baseTrimestral = calculateTrimestral(row.detalle, row.nota, row.periodo.orden);
    const recuperatorioPeriodo = row.periodo.orden === 1
      ? row.detalle?.recup1erTrim
      : row.periodo.orden === 2
        ? row.detalle?.recup2doTrim
        : row.periodo.orden === 3
          ? row.detalle?.recup3erTrim
          : null;

    current.periodos[row.periodo.orden] = {
      periodoId: row.periodoId,
      periodoNombre: row.periodo.nombre,
      notaBase: row.nota,
      notaTrimestral: baseTrimestral,
      recuperatorioPeriodo,
      duracion: row.periodo.duracion,
      detalle: row.detalle
    };
  }

  const groupedValues = [...grouped.values()];
  const reglasByGroupKey = await resolveReglasCalculoForResumen(groupedValues);

  const result = [];

  for (const group of groupedValues) {
    const groupKey = `${group.matriculaId}|${group.materiaAnualId}`;
    const regla = reglasByGroupKey.get(groupKey);

    for (const periodo of Object.values(group.periodos)) {
      periodo.notaTrimestral = applyEstrategiaCalculo(
        periodo.notaTrimestral,
        periodo.recuperatorioPeriodo,
        regla
      );
    }

    const notas = Object.values(group.periodos)
      .map((x) => x.notaTrimestral)
      .filter((x) => Number.isFinite(x));

    const promedioAnual = notas.length ? notas.reduce((acc, n) => acc + n, 0) / notas.length : null;
    const recuperacionAnual = resolveRecuperacionAnual(group);

    group.promedioAnual = roundByDecimals(promedioAnual, regla?.decimales ?? 2);
    group.recuperacionAnual = roundByDecimals(recuperacionAnual, regla?.decimales ?? 2);
    group.notaAnualFinal = applyEstrategiaCalculo(promedioAnual, recuperacionAnual, regla);
    group.reglaCalculoAplicada = regla
      ? {
          id: regla.id,
          anioLectivoId: regla.anioLectivoId,
          cursoMateriaDocenteId: regla.cursoMateriaDocenteId,
          duracion: regla.duracion,
          estrategia: regla.estrategia,
          decimales: regla.decimales,
          ponderacionRegular: regla.ponderacionRegular,
          ponderacionRecuperatorio: regla.ponderacionRecuperatorio
        }
      : null;

    result.push(group);
  }

  return result;
}

async function importFromCalifAlum({ anioId, sourceSchema, sourceTable, user, dryRun = false }) {
  const parsedAnioId = parsePositiveInteger(anioId, 'anioId');
  const safeSchema = validateSqlIdentifier(sourceSchema || 'calif_alum', 'sourceSchema');
  const safeTable = validateSqlIdentifier(sourceTable || 'calific_1ro_6to_2025', 'sourceTable');

  const anio = await prisma.anioLectivo.findUnique({ where: { id: parsedAnioId } });
  if (!anio) {
    throw createHttpError('Anio lectivo no encontrado.', 404);
  }

  const [periodos, cursos, materiasAnuales, alumnos, matriculas] = await Promise.all([
    prisma.periodo.findMany({
      where: { anioId: parsedAnioId },
      orderBy: { orden: 'asc' }
    }),
    prisma.curso.findMany({
      where: { anioId: parsedAnioId }
    }),
    prisma.materiaAnual.findMany({
      where: { anioId: parsedAnioId },
      include: { materia: true }
    }),
    prisma.alumno.findMany(),
    prisma.matricula.findMany({
      where: { curso: { anioId: parsedAnioId } }
    })
  ]);

  const periodosByOrden = new Map(periodos.map((p) => [p.orden, p]));
  const cursosMap = new Map(cursos.map((c) => [normalizeString(c.nombre), c]));
  const alumnosMap = new Map(alumnos.map((a) => [`${normalizeString(a.apellido)}|${normalizeString(a.nombre)}`, a]));
  const matriculasMap = new Map(matriculas.map((m) => [`${m.alumnoId}|${m.cursoId}`, m]));
  const materiasMap = new Map();

  for (const m of materiasAnuales) {
    materiasMap.set(normalizeString(m.nombre), m);
    if (m.materia?.codigoBase) {
      materiasMap.set(normalizeString(m.materia.codigoBase), m);
    }
  }

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      id,
      Materia,
      Apellidos,
      Nombres,
      Curso,
      NotaOrint1erTrim,
      Nota1erTrimMes1,
      Nota1erTrimMes2,
      Nota1erTrimMes3,
      Recup1erTrim,
      Observ1erTrim,
      NotaOrint2doTrim,
      Nota2doTrimMes1,
      Nota2doTrimMes2,
      Nota2doTrimMes3,
      Recup2doTrim,
      Observ2doTrim,
      NotaOrint3erTrim,
      Nota3erTrimMes1,
      Nota3erTrimMes2,
      Nota3erTrimMes3,
      Recup3erTrim,
      Observ3erTrim,
      AcompDic,
      AcompFeb,
      AlumConAcomp
    FROM \`${safeSchema}\`.\`${safeTable}\`
  `);

  const counters = {
    sourceRows: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    skippedMissingCurso: 0,
    skippedMissingAlumno: 0,
    skippedMissingMatricula: 0,
    skippedMissingMateriaAnual: 0,
    skippedMissingPeriodo: 0
  };

  for (const row of rows) {
    const curso = cursosMap.get(normalizeString(row.Curso));
    if (!curso) {
      counters.skipped += 1;
      counters.skippedMissingCurso += 1;
      continue;
    }

    const alumno = alumnosMap.get(`${normalizeString(row.Apellidos)}|${normalizeString(row.Nombres)}`);
    if (!alumno) {
      counters.skipped += 1;
      counters.skippedMissingAlumno += 1;
      continue;
    }

    const matricula = matriculasMap.get(`${alumno.id}|${curso.id}`);
    if (!matricula) {
      counters.skipped += 1;
      counters.skippedMissingMatricula += 1;
      continue;
    }

    const materiaAnual = materiasMap.get(normalizeString(row.Materia));
    if (!materiaAnual) {
      counters.skipped += 1;
      counters.skippedMissingMateriaAnual += 1;
      continue;
    }

    const trimestres = [
      {
        orden: 1,
        detalle: {
          notaOrint1erTrim: parseNullableNumber(row.NotaOrint1erTrim),
          nota1erTrimMes1: parseNullableNumber(row.Nota1erTrimMes1),
          nota1erTrimMes2: parseNullableNumber(row.Nota1erTrimMes2),
          nota1erTrimMes3: parseNullableNumber(row.Nota1erTrimMes3),
          recup1erTrim: parseNullableNumber(row.Recup1erTrim),
          observ1erTrim: row.Observ1erTrim ?? null
        }
      },
      {
        orden: 2,
        detalle: {
          notaOrint2doTrim: parseNullableNumber(row.NotaOrint2doTrim),
          nota2doTrimMes1: parseNullableNumber(row.Nota2doTrimMes1),
          nota2doTrimMes2: parseNullableNumber(row.Nota2doTrimMes2),
          nota2doTrimMes3: parseNullableNumber(row.Nota2doTrimMes3),
          recup2doTrim: parseNullableNumber(row.Recup2doTrim),
          observ2doTrim: row.Observ2doTrim ?? null
        }
      },
      {
        orden: 3,
        detalle: {
          notaOrint3erTrim: parseNullableNumber(row.NotaOrint3erTrim),
          nota3erTrimMes1: parseNullableNumber(row.Nota3erTrimMes1),
          nota3erTrimMes2: parseNullableNumber(row.Nota3erTrimMes2),
          nota3erTrimMes3: parseNullableNumber(row.Nota3erTrimMes3),
          recup3erTrim: parseNullableNumber(row.Recup3erTrim),
          observ3erTrim: row.Observ3erTrim ?? null,
          acompDic: row.AcompDic ?? null,
          acompFeb: row.AcompFeb ?? null,
          alumConAcomp: row.AlumConAcomp ?? null
        }
      }
    ];

    for (const trim of trimestres) {
      const periodo = periodosByOrden.get(trim.orden);
      if (!periodo) {
        counters.skipped += 1;
        counters.skippedMissingPeriodo += 1;
        continue;
      }

      const notaTrimestral = calculateTrimestral(trim.detalle, null, trim.orden);
      if (!Number.isFinite(notaTrimestral)) {
        continue;
      }

      if (dryRun) {
        const existing = await prisma.calificacion.findFirst({
          where: {
            matriculaId: matricula.id,
            materiaAnualId: materiaAnual.id,
            periodoId: periodo.id
          }
        });

        if (existing) {
          counters.updated += 1;
        } else {
          counters.created += 1;
        }
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const existing = await tx.calificacion.findFirst({
          where: {
            matriculaId: matricula.id,
            materiaAnualId: materiaAnual.id,
            periodoId: periodo.id
          }
        });

        let calificacion;
        if (existing) {
          calificacion = await tx.calificacion.update({
            where: { id: existing.id },
            data: {
              nota: notaTrimestral,
              fecha: null
            }
          });
          counters.updated += 1;
        } else {
          calificacion = await tx.calificacion.create({
            data: {
              matriculaId: matricula.id,
              materiaAnualId: materiaAnual.id,
              periodoId: periodo.id,
              nota: notaTrimestral,
              fecha: null
            }
          });
          counters.created += 1;
        }

        await tx.calificacionDetalle.upsert({
          where: { calificacionId: calificacion.id },
          create: {
            calificacionId: calificacion.id,
            ...trim.detalle
          },
          update: trim.detalle
        });
      });
    }
  }

  if (!dryRun) {
    await auditLogger({
      usuario: `user:${user.id}`,
      tablaAfectada: 'Calificacion',
      idRegistro: parsedAnioId,
      tipoOperacion: 'UPDATE',
      valorAnterior: null,
      valorNuevo: {
        import: {
          sourceSchema: safeSchema,
          sourceTable: safeTable,
          ...counters
        }
      }
    });
  }

  return {
    anioId: parsedAnioId,
    sourceSchema: safeSchema,
    sourceTable: safeTable,
    dryRun: Boolean(dryRun),
    ...counters
  };
}

module.exports = {
  getCalificaciones,
  getCalificacionById,
  createCalificacion,
  updateCalificacion,
  deleteCalificacion,
  resolveCreateReferences,
  getCalificacionesResumen,
  importFromCalifAlum
};
