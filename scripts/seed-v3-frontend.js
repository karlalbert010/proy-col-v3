/* eslint-disable no-console */
const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');

const ANIO = Number(process.env.V3_SEED_ANIO || 2025);

const CURSOS = ['1A', '1B'];
const MATERIAS = [
  { codigo: 'V3-MAT-LEN', nombre: 'Lengua' },
  { codigo: 'V3-MAT-MAT', nombre: 'Matematica' },
  { codigo: 'V3-MAT-HIS', nombre: 'Historia' }
];
const DOCENTES = [
  { username: 'doc.v3.1', dni: '83000001', apellido: 'Lopez', nombre: 'Diego', email: 'doc.v3.1@cole.local' },
  { username: 'doc.v3.2', dni: '83000002', apellido: 'Perez', nombre: 'Ana', email: 'doc.v3.2@cole.local' }
];
const ALUMNOS = [
  { dni: '93000001', apellido: 'Aguilar', nombre: 'Sofia', curso: '1A' },
  { dni: '93000002', apellido: 'Benitez', nombre: 'Tomas', curso: '1A' },
  { dni: '93000003', apellido: 'Correa', nombre: 'Lucia', curso: '1A' },
  { dni: '93000004', apellido: 'Diaz', nombre: 'Franco', curso: '1B' },
  { dni: '93000005', apellido: 'Estevez', nombre: 'Mora', curso: '1B' },
  { dni: '93000006', apellido: 'Fernandez', nombre: 'Mateo', curso: '1B' }
];

function notaDeterministica(id, periodoOrden, semilla) {
  const raw = ((id * 5 + periodoOrden * 11 + semilla * 7) % 51) / 10 + 5;
  return Number(raw.toFixed(2));
}

async function upsertAnio() {
  return prisma.anioLectivo.upsert({
    where: { anio: ANIO },
    update: { estado: 'ACTIVO' },
    create: { anio: ANIO, estado: 'ACTIVO' }
  });
}

async function upsertPeriodos(anioId) {
  const defs = [
    { orden: 1, nombre: 'Primer Trimestre' },
    { orden: 2, nombre: 'Segundo Trimestre' },
    { orden: 3, nombre: 'Tercer Trimestre' }
  ];

  const out = [];
  for (const p of defs) {
    out.push(
      await prisma.periodo.upsert({
        where: { anioId_orden: { anioId, orden: p.orden } },
        update: { nombre: p.nombre, duracion: 'TRIMESTRAL' },
        create: { anioId, orden: p.orden, nombre: p.nombre, duracion: 'TRIMESTRAL' }
      })
    );
  }
  return out;
}

async function upsertCursos(anioId) {
  const map = new Map();
  for (const nombre of CURSOS) {
    const curso = await prisma.curso.upsert({
      where: { id: -1 },
      update: {},
      create: { nombre, anioId }
    }).catch(async () => {
      const existing = await prisma.curso.findFirst({ where: { nombre, anioId } });
      if (existing) return existing;
      throw new Error(`No se pudo crear/obtener curso ${nombre}`);
    });
    map.set(nombre, curso);
  }
  return map;
}

async function upsertMaterias(anioId) {
  const map = new Map();
  for (const m of MATERIAS) {
    const materia = await prisma.materia.upsert({
      where: { codigoBase: m.codigo },
      update: { descripcion: m.nombre, activa: true },
      create: { codigoBase: m.codigo, descripcion: m.nombre, activa: true }
    });

    const materiaAnual = await prisma.materiaAnual.upsert({
      where: { materiaId_anioId: { materiaId: materia.id, anioId } },
      update: { nombre: m.nombre, cargaHoraria: 4 },
      create: { materiaId: materia.id, anioId, nombre: m.nombre, cargaHoraria: 4 }
    });

    map.set(m.codigo, { materia, materiaAnual });
  }
  return map;
}

async function upsertDocentes() {
  const pass = await bcrypt.hash('1234', 10);
  const map = new Map();

  for (const d of DOCENTES) {
    const usuario = await prisma.usuario.upsert({
      where: { username: d.username },
      update: { password: pass, rol: 'DOCENTE', activo: true },
      create: { username: d.username, password: pass, rol: 'DOCENTE', activo: true }
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

    map.set(d.username, docente);
  }
  return map;
}

async function upsertCursoMateriaYAsignaciones(cursosMap, materiasMap, docentesMap) {
  const asignaciones = [
    { curso: '1A', materia: 'V3-MAT-LEN', docente: 'doc.v3.1' },
    { curso: '1A', materia: 'V3-MAT-MAT', docente: 'doc.v3.2' },
    { curso: '1A', materia: 'V3-MAT-HIS', docente: 'doc.v3.1' },
    { curso: '1B', materia: 'V3-MAT-LEN', docente: 'doc.v3.1' },
    { curso: '1B', materia: 'V3-MAT-MAT', docente: 'doc.v3.2' },
    { curso: '1B', materia: 'V3-MAT-HIS', docente: 'doc.v3.2' }
  ];

  const cursoMateriaMap = new Map();
  for (const a of asignaciones) {
    const curso = cursosMap.get(a.curso);
    const materiaAnual = materiasMap.get(a.materia).materiaAnual;
    const docente = docentesMap.get(a.docente);

    const cursoMateria = await prisma.cursoMateria.upsert({
      where: { cursoId_materiaAnualId: { cursoId: curso.id, materiaAnualId: materiaAnual.id } },
      update: { activo: true },
      create: { cursoId: curso.id, materiaAnualId: materiaAnual.id, activo: true }
    });

    await prisma.cursoMateriaDocente.upsert({
      where: { id: -1 },
      update: {},
      create: {
        cursoMateriaId: cursoMateria.id,
        docenteId: docente.id,
        tipoAsignacion: 'TITULAR',
        fechaDesde: new Date(),
        activo: true
      }
    }).catch(async () => {
      const existing = await prisma.cursoMateriaDocente.findFirst({
        where: { cursoMateriaId: cursoMateria.id, docenteId: docente.id, activo: true }
      });
      if (existing) return existing;
      return prisma.cursoMateriaDocente.create({
        data: {
          cursoMateriaId: cursoMateria.id,
          docenteId: docente.id,
          tipoAsignacion: 'TITULAR',
          fechaDesde: new Date(),
          activo: true
        }
      });
    });

    cursoMateriaMap.set(`${curso.id}|${materiaAnual.id}`, cursoMateria);
  }

  return cursoMateriaMap;
}

async function upsertAlumnosYMatriculas(cursosMap, anioId) {
  const out = [];
  for (const a of ALUMNOS) {
    const alumno = await prisma.alumno.upsert({
      where: { dni: a.dni },
      update: { apellido: a.apellido, nombre: a.nombre, activo: true },
      create: { dni: a.dni, apellido: a.apellido, nombre: a.nombre, activo: true }
    });

    const curso = cursosMap.get(a.curso);
    const matricula = await prisma.matricula.upsert({
      where: { alumnoId_cursoId: { alumnoId: alumno.id, cursoId: curso.id } },
      update: { estado: 'ACTIVA', anioLectivoId: anioId },
      create: { alumnoId: alumno.id, cursoId: curso.id, estado: 'ACTIVA', anioLectivoId: anioId }
    });

    out.push({ alumno, matricula, curso });
  }
  return out;
}

async function upsertCalificaciones(periodos, matriculas, materiasMap, cursosMap) {
  const materiasPorCurso = {
    '1A': ['V3-MAT-LEN', 'V3-MAT-MAT', 'V3-MAT-HIS'],
    '1B': ['V3-MAT-LEN', 'V3-MAT-MAT', 'V3-MAT-HIS']
  };

  let total = 0;
  for (const [idx, m] of matriculas.entries()) {
    const cursoNombre = m.curso.nombre;
    for (const codigo of materiasPorCurso[cursoNombre]) {
      const materiaAnual = materiasMap.get(codigo).materiaAnual;

      for (const periodo of periodos) {
        const nota = notaDeterministica(m.matricula.id, periodo.orden, idx + materiaAnual.id);
        const calif = await prisma.calificacion.upsert({
          where: {
            matriculaId_materiaAnualId_periodoId: {
              matriculaId: m.matricula.id,
              materiaAnualId: materiaAnual.id,
              periodoId: periodo.id
            }
          },
          update: { nota, fecha: new Date() },
          create: {
            matriculaId: m.matricula.id,
            materiaAnualId: materiaAnual.id,
            periodoId: periodo.id,
            nota,
            fecha: new Date()
          }
        });

        const detalleData = {
          notaOrint1erTrim: periodo.orden === 1 ? nota : null,
          nota1erTrimMes1: periodo.orden === 1 ? nota : null,
          nota1erTrimMes2: null,
          nota1erTrimMes3: null,
          recup1erTrim: null,
          observ1erTrim: null,
          notaOrint2doTrim: periodo.orden === 2 ? nota : null,
          nota2doTrimMes1: periodo.orden === 2 ? nota : null,
          nota2doTrimMes2: null,
          nota2doTrimMes3: null,
          recup2doTrim: null,
          observ2doTrim: null,
          notaOrint3erTrim: periodo.orden === 3 ? nota : null,
          nota3erTrimMes1: periodo.orden === 3 ? nota : null,
          nota3erTrimMes2: null,
          nota3erTrimMes3: null,
          recup3erTrim: null,
          observ3erTrim: null,
          acompDic: null,
          acompFeb: null,
          alumConAcomp: null
        };

        await prisma.calificacionDetalle.upsert({
          where: { calificacionId: calif.id },
          update: detalleData,
          create: { calificacionId: calif.id, ...detalleData }
        });

        total += 1;
      }
    }
  }
  return total;
}

async function main() {
  const anio = await upsertAnio();
  const periodos = await upsertPeriodos(anio.id);
  const cursosMap = await upsertCursos(anio.id);
  const materiasMap = await upsertMaterias(anio.id);
  const docentesMap = await upsertDocentes();
  await upsertCursoMateriaYAsignaciones(cursosMap, materiasMap, docentesMap);
  const matriculas = await upsertAlumnosYMatriculas(cursosMap, anio.id);
  const totalCalif = await upsertCalificaciones(periodos, matriculas, materiasMap, cursosMap);

  console.log(JSON.stringify({
    ok: true,
    db: 'cole_db_v3',
    anio: ANIO,
    cursos: CURSOS.length,
    materias: MATERIAS.length,
    docentes: DOCENTES.length,
    alumnos: ALUMNOS.length,
    calificaciones: totalCalif,
    loginAdmin: { user: 'admin', pass: 'admin123' },
    loginDocente: { user: DOCENTES[0].username, pass: '1234' }
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Seed v3 error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
