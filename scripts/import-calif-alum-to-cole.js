/* eslint-disable no-console */
const crypto = require('crypto');
const prisma = require('../src/config/prisma');

const DEFAULT_SOURCE_SCHEMA = process.env.IMPORT_SOURCE_SCHEMA || 'calif_alum';
const DEFAULT_SOURCE_TABLE = process.env.IMPORT_SOURCE_TABLE || 'calific_1ro_6to_2025';
const DEFAULT_ANIO_ID = Number(process.env.IMPORT_ANIO_ID || 2);
const DRY_RUN = String(process.env.IMPORT_DRY_RUN || 'false').toLowerCase() === 'true';

function normalize(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function calculateTrimNota(row, trim) {
  const mes1 = parseNullableNumber(row[`Nota${trim}TrimMes1`]);
  const mes2 = parseNullableNumber(row[`Nota${trim}TrimMes2`]);
  const mes3 = parseNullableNumber(row[`Nota${trim}TrimMes3`]);
  const recup = parseNullableNumber(row[`Recup${trim}Trim`]);

  if (Number.isFinite(recup)) {
    return recup;
  }

  const notas = [mes1, mes2, mes3].filter((x) => Number.isFinite(x));
  if (notas.length === 0) {
    return null;
  }

  return Number((notas.reduce((acc, n) => acc + n, 0) / notas.length).toFixed(2));
}

function buildCodigoBase(materiaNombre, usedCodes) {
  const hash = crypto.createHash('sha1').update(materiaNombre).digest('hex').slice(0, 10).toUpperCase();
  let code = `SRC-${hash}`;
  let suffix = 1;

  while (usedCodes.has(code)) {
    code = `SRC-${hash}-${suffix}`;
    suffix += 1;
  }

  usedCodes.add(code);
  return code;
}

function buildDni(apellido, nombre, usedDni) {
  const seed = `${normalize(apellido)}|${normalize(nombre)}`;
  const hash = crypto.createHash('sha1').update(seed).digest('hex');
  let base = 20000000 + (parseInt(hash.slice(0, 8), 16) % 70000000);
  let dni = String(base).padStart(8, '0');

  while (usedDni.has(dni)) {
    base += 1;
    dni = String(base).padStart(8, '0');
  }

  usedDni.add(dni);
  return dni;
}

async function ensureAnio(anioId) {
  const anio = await prisma.anioLectivo.findUnique({ where: { id: anioId } });
  if (!anio) {
    throw new Error(`No existe AnioLectivo con id=${anioId}`);
  }
  return anio;
}

async function loadSourceRows(schema, table) {
  const sql = `
    SELECT
      id,
      TRIM(Materia) AS Materia,
      TRIM(Apellidos) AS Apellidos,
      TRIM(Nombres) AS Nombres,
      TRIM(Curso) AS Curso,
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
    FROM \`${schema}\`.\`${table}\`
  `;

  return prisma.$queryRawUnsafe(sql);
}

async function main() {
  const anio = await ensureAnio(DEFAULT_ANIO_ID);
  const rows = await loadSourceRows(DEFAULT_SOURCE_SCHEMA, DEFAULT_SOURCE_TABLE);

  const counters = {
    sourceRows: rows.length,
    cursosCreated: 0,
    periodosCreated: 0,
    materiasCreated: 0,
    materiasAnualesCreated: 0,
    alumnosCreated: 0,
    matriculasCreated: 0,
    calificacionesCreated: 0,
    calificacionesUpdated: 0,
    detallesCreated: 0,
    detallesUpdated: 0,
    skippedNoNota: 0
  };

  const [cursosDb, periodosDb, materiasDb, materiasAnualesDb, alumnosDb, matriculasDb, calificacionesDb] =
    await Promise.all([
      prisma.curso.findMany({ where: { anioId: anio.id } }),
      prisma.periodo.findMany({ where: { anioId: anio.id } }),
      prisma.materia.findMany(),
      prisma.materiaAnual.findMany({ where: { anioId: anio.id }, include: { materia: true } }),
      prisma.alumno.findMany(),
      prisma.matricula.findMany({ where: { curso: { anioId: anio.id } } }),
      prisma.calificacion.findMany({
        where: {
          periodo: { anioId: anio.id }
        }
      })
    ]);

  const cursosMap = new Map(cursosDb.map((c) => [normalize(c.nombre), c]));
  const periodosMap = new Map(periodosDb.map((p) => [p.orden, p]));
  const materiasByCodigo = new Map(materiasDb.map((m) => [normalize(m.codigoBase), m]));
  const materiasByDesc = new Map(materiasDb.map((m) => [normalize(m.descripcion), m]));
  const materiaAnualMap = new Map(materiasAnualesDb.map((m) => [normalize(m.nombre), m]));
  const alumnoMap = new Map(alumnosDb.map((a) => [`${normalize(a.apellido)}|${normalize(a.nombre)}`, a]));
  const usedDni = new Set(alumnosDb.map((a) => a.dni));
  const usedCodes = new Set(materiasDb.map((m) => m.codigoBase));
  const matriculaMap = new Map(matriculasDb.map((m) => [`${m.alumnoId}|${m.cursoId}`, m]));
  const califMap = new Map(calificacionesDb.map((c) => [`${c.matriculaId}|${c.materiaAnualId}|${c.periodoId}`, c]));

  const sourceCursos = [...new Set(rows.map((r) => r.Curso).filter(Boolean))];
  const sourceMaterias = [...new Set(rows.map((r) => r.Materia).filter(Boolean))];

  for (const cursoNombre of sourceCursos) {
    const key = normalize(cursoNombre);
    if (cursosMap.has(key)) {
      continue;
    }
    if (!DRY_RUN) {
      const created = await prisma.curso.create({
        data: { nombre: cursoNombre, anioId: anio.id }
      });
      cursosMap.set(key, created);
    }
    counters.cursosCreated += 1;
  }

  const requiredPeriodos = [
    { orden: 1, nombre: 'Primer Trimestre' },
    { orden: 2, nombre: 'Segundo Trimestre' },
    { orden: 3, nombre: 'Tercer Trimestre' }
  ];
  for (const p of requiredPeriodos) {
    if (periodosMap.has(p.orden)) {
      continue;
    }
    if (!DRY_RUN) {
      const created = await prisma.periodo.create({
        data: { anioId: anio.id, orden: p.orden, nombre: p.nombre }
      });
      periodosMap.set(p.orden, created);
    }
    counters.periodosCreated += 1;
  }

  for (const materiaNombre of sourceMaterias) {
    const key = normalize(materiaNombre);
    if (materiaAnualMap.has(key)) {
      continue;
    }

    let materia = materiasByDesc.get(key) || materiasByCodigo.get(key);
    if (!materia) {
      if (!DRY_RUN) {
        const codigoBase = buildCodigoBase(materiaNombre, usedCodes);
        materia = await prisma.materia.create({
          data: {
            codigoBase,
            descripcion: materiaNombre,
            activa: true
          }
        });
        materiasByDesc.set(key, materia);
      }
      counters.materiasCreated += 1;
    }

    if (!DRY_RUN) {
      const created = await prisma.materiaAnual.create({
        data: {
          materiaId: materia.id,
          anioId: anio.id,
          nombre: materiaNombre
        },
        include: { materia: true }
      });
      materiaAnualMap.set(key, created);
    }
    counters.materiasAnualesCreated += 1;
  }

  for (const row of rows) {
    const alumnoKey = `${normalize(row.Apellidos)}|${normalize(row.Nombres)}`;
    if (!row.Apellidos || !row.Nombres) {
      continue;
    }

    if (!alumnoMap.has(alumnoKey)) {
      if (!DRY_RUN) {
        const dni = buildDni(row.Apellidos, row.Nombres, usedDni);
        const created = await prisma.alumno.create({
          data: {
            apellido: row.Apellidos,
            nombre: row.Nombres,
            dni,
            activo: true
          }
        });
        alumnoMap.set(alumnoKey, created);
      }
      counters.alumnosCreated += 1;
    }
  }

  for (const row of rows) {
    const alumno = alumnoMap.get(`${normalize(row.Apellidos)}|${normalize(row.Nombres)}`);
    const curso = cursosMap.get(normalize(row.Curso));
    if (!alumno || !curso) {
      continue;
    }

    const key = `${alumno.id}|${curso.id}`;
    if (matriculaMap.has(key)) {
      continue;
    }

    if (!DRY_RUN) {
      const created = await prisma.matricula.create({
        data: {
          alumnoId: alumno.id,
          cursoId: curso.id
        }
      });
      matriculaMap.set(key, created);
    }
    counters.matriculasCreated += 1;
  }

  for (const row of rows) {
    const alumno = alumnoMap.get(`${normalize(row.Apellidos)}|${normalize(row.Nombres)}`);
    const curso = cursosMap.get(normalize(row.Curso));
    const materiaAnual = materiaAnualMap.get(normalize(row.Materia));
    if (!alumno || !curso || !materiaAnual) {
      continue;
    }

    const matricula = matriculaMap.get(`${alumno.id}|${curso.id}`);
    if (!matricula) {
      continue;
    }

    const detallePayload = {
      notaOrint1erTrim: parseNullableNumber(row.NotaOrint1erTrim),
      nota1erTrimMes1: parseNullableNumber(row.Nota1erTrimMes1),
      nota1erTrimMes2: parseNullableNumber(row.Nota1erTrimMes2),
      nota1erTrimMes3: parseNullableNumber(row.Nota1erTrimMes3),
      recup1erTrim: parseNullableNumber(row.Recup1erTrim),
      observ1erTrim: row.Observ1erTrim || null,
      notaOrint2doTrim: parseNullableNumber(row.NotaOrint2doTrim),
      nota2doTrimMes1: parseNullableNumber(row.Nota2doTrimMes1),
      nota2doTrimMes2: parseNullableNumber(row.Nota2doTrimMes2),
      nota2doTrimMes3: parseNullableNumber(row.Nota2doTrimMes3),
      recup2doTrim: parseNullableNumber(row.Recup2doTrim),
      observ2doTrim: row.Observ2doTrim || null,
      notaOrint3erTrim: parseNullableNumber(row.NotaOrint3erTrim),
      nota3erTrimMes1: parseNullableNumber(row.Nota3erTrimMes1),
      nota3erTrimMes2: parseNullableNumber(row.Nota3erTrimMes2),
      nota3erTrimMes3: parseNullableNumber(row.Nota3erTrimMes3),
      recup3erTrim: parseNullableNumber(row.Recup3erTrim),
      observ3erTrim: row.Observ3erTrim || null,
      acompDic: row.AcompDic || null,
      acompFeb: row.AcompFeb || null,
      alumConAcomp: row.AlumConAcomp || null
    };

    for (const trim of [1, 2, 3]) {
      const periodo = periodosMap.get(trim);
      if (!periodo) {
        continue;
      }

      const nota = calculateTrimNota(row, trim === 1 ? '1er' : trim === 2 ? '2do' : '3er');
      if (!Number.isFinite(nota)) {
        counters.skippedNoNota += 1;
        continue;
      }

      const key = `${matricula.id}|${materiaAnual.id}|${periodo.id}`;
      const existing = califMap.get(key);

      if (!DRY_RUN) {
        const calificacion = existing
          ? await prisma.calificacion.update({
              where: { id: existing.id },
              data: { nota, fecha: null }
            })
          : await prisma.calificacion.create({
              data: {
                matriculaId: matricula.id,
                materiaAnualId: materiaAnual.id,
                periodoId: periodo.id,
                nota,
                fecha: null
              }
            });

        if (!existing) {
          califMap.set(key, calificacion);
        }

        const detalleExisting = await prisma.calificacionDetalle.findUnique({
          where: { calificacionId: calificacion.id }
        });

        if (detalleExisting) {
          await prisma.calificacionDetalle.update({
            where: { calificacionId: calificacion.id },
            data: detallePayload
          });
          counters.detallesUpdated += 1;
        } else {
          await prisma.calificacionDetalle.create({
            data: {
              calificacionId: calificacion.id,
              ...detallePayload
            }
          });
          counters.detallesCreated += 1;
        }
      }

      if (existing) {
        counters.calificacionesUpdated += 1;
      } else {
        counters.calificacionesCreated += 1;
      }
    }
  }

  const totalCalificaciones = DRY_RUN ? null : await prisma.calificacion.count();
  const totalDetalles = DRY_RUN ? null : await prisma.calificacionDetalle.count();
  const totalAlumnos = DRY_RUN ? null : await prisma.alumno.count();
  const totalMateriasAnuales = DRY_RUN ? null : await prisma.materiaAnual.count({ where: { anioId: anio.id } });
  const totalCursos = DRY_RUN ? null : await prisma.curso.count({ where: { anioId: anio.id } });
  const totalPeriodos = DRY_RUN ? null : await prisma.periodo.count({ where: { anioId: anio.id } });
  const totalMatriculas = DRY_RUN
    ? null
    : await prisma.matricula.count({
        where: {
          curso: { anioId: anio.id }
        }
      });

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        anioId: anio.id,
        source: `${DEFAULT_SOURCE_SCHEMA}.${DEFAULT_SOURCE_TABLE}`,
        counters,
        totals: {
          totalAlumnos,
          totalCursos,
          totalMateriasAnuales,
          totalPeriodos,
          totalMatriculas,
          totalCalificaciones,
          totalDetalles
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Import error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
