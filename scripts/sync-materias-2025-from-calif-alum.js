/* eslint-disable no-console */
const crypto = require('crypto');
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

function buildCodeBase(nombre, usedCodes) {
  const hash = crypto.createHash('sha1').update(normalizeText(nombre)).digest('hex').slice(0, 10).toUpperCase();
  let code = `CALIF-${hash}`;
  let suffix = 1;
  while (usedCodes.has(code)) {
    code = `CALIF-${hash}-${suffix}`;
    suffix += 1;
  }
  usedCodes.add(code);
  return code;
}

async function readCursoMateriaSource() {
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

async function main() {
  const anioLectivo = await prisma.anioLectivo.findUnique({ where: { anio: TARGET_ANIO } });
  if (!anioLectivo) {
    throw new Error(`No existe AnioLectivo.anio=${TARGET_ANIO}`);
  }

  const cursoMateriaRows = await readCursoMateriaSource();
  if (cursoMateriaRows.length === 0) {
    throw new Error(`No se encontraron filas en ${SOURCE_SCHEMA}.${SOURCE_TABLE}`);
  }

  const cursosMap = new Map();
  for (const row of cursoMateriaRows) {
    const key = normalizeText(row.curso);
    if (!cursosMap.has(key)) {
      cursosMap.set(key, { curso: row.curso, materias: [] });
    }
    cursosMap.get(key).materias.push(row.materia);
  }

  const existingMaterias = await prisma.materia.findMany();
  const usedCodes = new Set(existingMaterias.map((m) => m.codigoBase));
  const byNormalizedDesc = new Map(existingMaterias.map((m) => [normalizeText(m.descripcion), m]));

  const uniqueMaterias = [...new Set(cursoMateriaRows.map((r) => r.materia))];

  let materiasCreated = 0;
  let materiasActivated = 0;
  let materiasAnualesCreated = 0;
  let materiasAnualesUpdated = 0;

  for (const materiaNombre of uniqueMaterias) {
    const key = normalizeText(materiaNombre);
    let materia = byNormalizedDesc.get(key);

    if (!materia) {
      const codigoBase = buildCodeBase(materiaNombre, usedCodes);
      materia = await prisma.materia.create({
        data: {
          codigoBase,
          descripcion: materiaNombre,
          activa: true
        }
      });
      byNormalizedDesc.set(key, materia);
      materiasCreated += 1;
    } else if (!materia.activa) {
      materia = await prisma.materia.update({
        where: { id: materia.id },
        data: { activa: true }
      });
      byNormalizedDesc.set(key, materia);
      materiasActivated += 1;
    }

    const existingMa = await prisma.materiaAnual.findUnique({
      where: {
        materiaId_anioId: {
          materiaId: materia.id,
          anioId: anioLectivo.id
        }
      }
    });

    if (!existingMa) {
      await prisma.materiaAnual.create({
        data: {
          materiaId: materia.id,
          anioId: anioLectivo.id,
          nombre: materiaNombre,
          cargaHoraria: null
        }
      });
      materiasAnualesCreated += 1;
    } else {
      await prisma.materiaAnual.update({
        where: { id: existingMa.id },
        data: { nombre: materiaNombre }
      });
      materiasAnualesUpdated += 1;
    }
  }

  const resumenCursos = Array.from(cursosMap.values())
    .map((entry) => ({
      curso: entry.curso,
      materias: [...new Set(entry.materias)].sort()
    }))
    .sort((a, b) => String(a.curso).localeCompare(String(b.curso)));

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: `${SOURCE_SCHEMA}.${SOURCE_TABLE}`,
        targetAnio: TARGET_ANIO,
        targetAnioId: anioLectivo.id,
        cursosDetectados: resumenCursos.length,
        materiasUnicasDetectadas: uniqueMaterias.length,
        cambios: {
          materiasCreated,
          materiasActivated,
          materiasAnualesCreated,
          materiasAnualesUpdated
        },
        cursos: resumenCursos
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Sync error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
