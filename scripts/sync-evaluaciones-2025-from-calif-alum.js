/* eslint-disable no-console */
const prisma = require('../src/config/prisma');

const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || 'calif_alum';
const SOURCE_TABLE = process.env.SOURCE_TABLE || 'calific_1ro_6to_2025';
const TARGET_ANIO = Number(process.env.TARGET_ANIO || 2025);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

async function getSourcePairs() {
  const sql = `
    SELECT
      TRIM(Curso) AS curso,
      TRIM(Materia) AS materia
    FROM \`${SOURCE_SCHEMA}\`.\`${SOURCE_TABLE}\`
    WHERE TRIM(Curso) <> '' AND TRIM(Materia) <> ''
    GROUP BY TRIM(Curso), TRIM(Materia)
    ORDER BY TRIM(Curso), TRIM(Materia)
  `;
  return prisma.$queryRawUnsafe(sql);
}

function buildTitulo({ cursoNombre, materiaNombre, periodoOrden }) {
  return `CALIF-${TARGET_ANIO}-${cursoNombre}-${materiaNombre}-P${periodoOrden}`;
}

async function main() {
  const anio = await prisma.anioLectivo.findUnique({
    where: { anio: TARGET_ANIO }
  });
  if (!anio) {
    throw new Error(`No existe AnioLectivo.anio=${TARGET_ANIO}`);
  }

  const periodos = await prisma.periodo.findMany({
    where: {
      anioId: anio.id,
      orden: { in: [1, 2, 3] }
    },
    orderBy: { orden: 'asc' }
  });
  if (periodos.length !== 3) {
    throw new Error(`Faltan periodos 1/2/3 para anio ${TARGET_ANIO}.`);
  }
  const periodoByOrden = new Map(periodos.map((p) => [p.orden, p]));

  // 1) Toda evaluacion del anio 2025 queda activa (ABIERTA)
  const updateAll = await prisma.evaluacion.updateMany({
    where: {
      periodo: { anioId: anio.id }
    },
    data: {
      estado: 'ABIERTA'
    }
  });

  const sourcePairs = await getSourcePairs();

  const cursos = await prisma.curso.findMany({ where: { anioId: anio.id } });
  const cursosByName = new Map(cursos.map((c) => [normalizeText(c.nombre), c]));

  const materiasAnuales = await prisma.materiaAnual.findMany({
    where: { anioId: anio.id }
  });
  const maByNombre = new Map(materiasAnuales.map((m) => [normalizeText(m.nombre), m]));

  const cmdRows = await prisma.cursoMateriaDocente.findMany({
    where: {
      materiaAnual: { anioId: anio.id }
    }
  });
  const cmdByKey = new Map(cmdRows.map((r) => [`${r.cursoId}|${r.materiaAnualId}`, r]));

  const tipos = [
    { tipo: 'ORIENTADORA', suffix: 'ORIENTADORA' },
    { tipo: 'MES_1', suffix: 'MES1' },
    { tipo: 'MES_2', suffix: 'MES2' },
    { tipo: 'MES_3', suffix: 'MES3' }
  ];

  let created = 0;
  let updated = 0;
  let missingCurso = 0;
  let missingMateriaAnual = 0;
  let missingAsignacion = 0;

  for (const pair of sourcePairs) {
    const curso = cursosByName.get(normalizeText(pair.curso));
    if (!curso) {
      missingCurso += 1;
      continue;
    }

    const materiaAnual = maByNombre.get(normalizeText(pair.materia));
    if (!materiaAnual) {
      missingMateriaAnual += 1;
      continue;
    }

    const cmd = cmdByKey.get(`${curso.id}|${materiaAnual.id}`);
    if (!cmd) {
      missingAsignacion += 1;
      continue;
    }

    for (const orden of [1, 2, 3]) {
      const periodo = periodoByOrden.get(orden);
      const baseTitulo = buildTitulo({
        cursoNombre: curso.nombre,
        materiaNombre: materiaAnual.nombre,
        periodoOrden: orden
      });

      for (const t of tipos) {
        const titulo = `${baseTitulo}-${t.suffix}`;
        const existing = await prisma.evaluacion.findFirst({
          where: {
            cursoMateriaDocenteId: cmd.id,
            periodoId: periodo.id,
            titulo
          }
        });

        if (!existing) {
          await prisma.evaluacion.create({
            data: {
              cursoMateriaDocenteId: cmd.id,
              periodoId: periodo.id,
              tipo: t.tipo,
              fecha: new Date(Date.UTC(TARGET_ANIO, orden * 2, 10)),
              titulo,
              descripcion: `Evaluacion sincronizada desde ${SOURCE_SCHEMA}.${SOURCE_TABLE}`,
              ponderacion: 1,
              estado: 'ABIERTA'
            }
          });
          created += 1;
        } else {
          await prisma.evaluacion.update({
            where: { id: existing.id },
            data: {
              estado: 'ABIERTA',
              tipo: t.tipo
            }
          });
          updated += 1;
        }
      }
    }
  }

  const totalEvaluaciones2025 = await prisma.evaluacion.count({
    where: { periodo: { anioId: anio.id } }
  });
  const abiertas2025 = await prisma.evaluacion.count({
    where: { periodo: { anioId: anio.id }, estado: 'ABIERTA' }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: `${SOURCE_SCHEMA}.${SOURCE_TABLE}`,
        targetAnio: TARGET_ANIO,
        targetAnioId: anio.id,
        sourcePairs: sourcePairs.length,
        updateAllEvaluaciones2025: updateAll.count,
        sync: {
          created,
          updated,
          missingCurso,
          missingMateriaAnual,
          missingAsignacion
        },
        totals2025: {
          totalEvaluaciones: totalEvaluaciones2025,
          abiertas: abiertas2025
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Sync evaluaciones 2025 error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
