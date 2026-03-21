/* eslint-disable no-console */
const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');

const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || 'calif_alum';
const SOURCE_TABLE = process.env.SOURCE_TABLE || 'calific_1ro_6to_2025';
const TARGET_ANIO = Number(process.env.TARGET_ANIO || 2025);
const DOCENTE_PASSWORD = process.env.DOCENTE_PASSWORD || 'docente123';

const DOCENTES = [
  { username: 'doc.2025.jperez1', dni: '81000001', apellido: 'Perez', nombre: 'Juan', email: 'doc.2025.jperez1@cole.local' },
  { username: 'doc.2025.jperez2', dni: '81000002', apellido: 'Perez', nombre: 'Juan', email: 'doc.2025.jperez2@cole.local' },
  { username: 'doc.2025.agomez', dni: '81000003', apellido: 'Gomez', nombre: 'Ana', email: 'doc.2025.agomez@cole.local' },
  { username: 'doc.2025.bramos', dni: '81000004', apellido: 'Ramos', nombre: 'Bruno', email: 'doc.2025.bramos@cole.local' },
  { username: 'doc.2025.csuarez', dni: '81000005', apellido: 'Suarez', nombre: 'Carla', email: 'doc.2025.csuarez@cole.local' },
  { username: 'doc.2025.dlopez', dni: '81000006', apellido: 'Lopez', nombre: 'Diego', email: 'doc.2025.dlopez@cole.local' }
];

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

async function main() {
  const anio = await prisma.anioLectivo.findUnique({ where: { anio: TARGET_ANIO } });
  if (!anio) {
    throw new Error(`No existe AnioLectivo.anio=${TARGET_ANIO}`);
  }

  const pairs = await getSourcePairs();
  if (pairs.length === 0) {
    throw new Error(`No hay pares curso-materia en ${SOURCE_SCHEMA}.${SOURCE_TABLE}`);
  }

  const passwordHash = await bcrypt.hash(DOCENTE_PASSWORD, 10);
  const docentesRows = [];
  for (const d of DOCENTES) {
    const usuario = await prisma.usuario.upsert({
      where: { username: d.username },
      update: { password: passwordHash, rol: 'DOCENTE', activo: true },
      create: { username: d.username, password: passwordHash, rol: 'DOCENTE', activo: true }
    });
    const docente = await prisma.docente.upsert({
      where: { dni: d.dni },
      update: {
        usuarioId: usuario.id,
        apellido: d.apellido,
        nombre: d.nombre,
        email: d.email,
        activo: true
      },
      create: {
        usuarioId: usuario.id,
        dni: d.dni,
        apellido: d.apellido,
        nombre: d.nombre,
        email: d.email,
        activo: true
      }
    });
    docentesRows.push(docente);
  }

  const uniqueCursos = [...new Set(pairs.map((p) => p.curso))];
  const cursosByName = new Map();
  for (const nombre of uniqueCursos) {
    let curso = await prisma.curso.findFirst({ where: { anioId: anio.id, nombre } });
    if (!curso) {
      curso = await prisma.curso.create({ data: { anioId: anio.id, nombre } });
    }
    cursosByName.set(normalizeText(nombre), curso);
  }

  const materiasAnuales = await prisma.materiaAnual.findMany({
    where: { anioId: anio.id }
  });
  const maByName = new Map(materiasAnuales.map((m) => [normalizeText(m.nombre), m]));

  let asignacionesCreated = 0;
  let asignacionesUpdated = 0;
  let skippedNoMateriaAnual = 0;

  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i];
    const curso = cursosByName.get(normalizeText(pair.curso));
    const materiaAnual = maByName.get(normalizeText(pair.materia));
    if (!curso || !materiaAnual) {
      skippedNoMateriaAnual += 1;
      continue;
    }
    const docente = docentesRows[i % docentesRows.length];

    const existing = await prisma.cursoMateriaDocente.findUnique({
      where: {
        cursoId_materiaAnualId: {
          cursoId: curso.id,
          materiaAnualId: materiaAnual.id
        }
      }
    });

    if (!existing) {
      await prisma.cursoMateriaDocente.create({
        data: {
          cursoId: curso.id,
          materiaAnualId: materiaAnual.id,
          docenteId: docente.id,
          activo: true
        }
      });
      asignacionesCreated += 1;
    } else {
      await prisma.cursoMateriaDocente.update({
        where: { id: existing.id },
        data: { docenteId: docente.id, activo: true }
      });
      asignacionesUpdated += 1;
    }
  }

  const cargaDocente = await prisma.cursoMateriaDocente.groupBy({
    by: ['docenteId'],
    _count: { _all: true },
    where: { materiaAnual: { anioId: anio.id } }
  });
  const cargaMap = new Map(cargaDocente.map((c) => [c.docenteId, c._count._all]));

  const resumenDocentes = docentesRows.map((d) => ({
    id: d.id,
    apellido: d.apellido,
    nombre: d.nombre,
    dni: d.dni,
    asignaciones: cargaMap.get(d.id) || 0
  }));

  console.log(
    JSON.stringify(
      {
        ok: true,
        targetAnio: TARGET_ANIO,
        targetAnioId: anio.id,
        docentes: DOCENTES.length,
        cursosDetectados: uniqueCursos.length,
        paresCursoMateriaDetectados: pairs.length,
        cambios: {
          asignacionesCreated,
          asignacionesUpdated,
          skippedNoMateriaAnual
        },
        docentesResumen: resumenDocentes,
        credencialesDocente: {
          usernameEjemplo: DOCENTES[0].username,
          password: DOCENTE_PASSWORD
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Seed docentes 2025 error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
