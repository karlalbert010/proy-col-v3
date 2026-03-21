/* eslint-disable no-console */
const bcrypt = require('bcrypt');

const prisma = require('../src/config/prisma');

const DEMO_ANIO = Number(process.env.DEMO_ANIO || 2091);
const DOCENTE_PASSWORD = process.env.DEMO_DOCENTE_PASSWORD || 'docente123';

const MATERIAS = [
  { codigoBase: 'DEMO-MAT-01', nombre: 'Lengua' },
  { codigoBase: 'DEMO-MAT-02', nombre: 'Matematica' },
  { codigoBase: 'DEMO-MAT-03', nombre: 'Historia' },
  { codigoBase: 'DEMO-MAT-04', nombre: 'Geografia' },
  { codigoBase: 'DEMO-MAT-05', nombre: 'Biologia' },
  { codigoBase: 'DEMO-MAT-06', nombre: 'Ingles' },
  { codigoBase: 'DEMO-MAT-07', nombre: 'Fisica' },
  { codigoBase: 'DEMO-MAT-08', nombre: 'Quimica' },
  { codigoBase: 'DEMO-MAT-09', nombre: 'Tecnologia' },
  { codigoBase: 'DEMO-MAT-10', nombre: 'Arte' }
];

const DOCENTES = [
  { username: 'demo.docente1', dni: '70000001', apellido: 'Lopez', nombre: 'Ana', email: 'demo.docente1@cole.local' },
  { username: 'demo.docente2', dni: '70000002', apellido: 'Ramos', nombre: 'Bruno', email: 'demo.docente2@cole.local' },
  { username: 'demo.docente3', dni: '70000003', apellido: 'Suarez', nombre: 'Carla', email: 'demo.docente3@cole.local' },
  { username: 'demo.docente4', dni: '70000004', apellido: 'Diaz', nombre: 'Diego', email: 'demo.docente4@cole.local' },
  { username: 'demo.docente5', dni: '70000005', apellido: 'Mendez', nombre: 'Elena', email: 'demo.docente5@cole.local' }
];

const CURSOS = ['1A', '1B', '2A', '2B'];

const ALUMNOS = [
  { dni: '50000001', apellido: 'Gomez', nombre: 'Juan', curso: '1A' },
  { dni: '50000002', apellido: 'Gomez', nombre: 'Juan', curso: '1A' },
  { dni: '50000003', apellido: 'Perez', nombre: 'Lucia', curso: '1A' },
  { dni: '50000004', apellido: 'Rios', nombre: 'Tomas', curso: '1A' },
  { dni: '50000005', apellido: 'Sosa', nombre: 'Valentina', curso: '1A' },
  { dni: '50000006', apellido: 'Acosta', nombre: 'Nicolas', curso: '1B' },
  { dni: '50000007', apellido: 'Benitez', nombre: 'Camila', curso: '1B' },
  { dni: '50000008', apellido: 'Castro', nombre: 'Mateo', curso: '1B' },
  { dni: '50000009', apellido: 'Dominguez', nombre: 'Sofia', curso: '1B' },
  { dni: '50000010', apellido: 'Estevez', nombre: 'Thiago', curso: '1B' },
  { dni: '50000011', apellido: 'Fernandez', nombre: 'Julieta', curso: '2A' },
  { dni: '50000012', apellido: 'Gimenez', nombre: 'Agustin', curso: '2A' },
  { dni: '50000013', apellido: 'Herrera', nombre: 'Mora', curso: '2A' },
  { dni: '50000014', apellido: 'Ibarra', nombre: 'Franco', curso: '2A' },
  { dni: '50000015', apellido: 'Juarez', nombre: 'Renata', curso: '2A' },
  { dni: '50000016', apellido: 'Keller', nombre: 'Lautaro', curso: '2B' },
  { dni: '50000017', apellido: 'Luna', nombre: 'Martina', curso: '2B' },
  { dni: '50000018', apellido: 'Molina', nombre: 'Benjamin', curso: '2B' },
  { dni: '50000019', apellido: 'Navarro', nombre: 'Emma', curso: '2B' },
  { dni: '50000020', apellido: 'Ortega', nombre: 'Santino', curso: '2B' }
];

const ASIGNACIONES = [
  { curso: '1A', materiaCode: 'DEMO-MAT-01', docente: 'demo.docente1' },
  { curso: '1A', materiaCode: 'DEMO-MAT-02', docente: 'demo.docente2' },
  { curso: '1A', materiaCode: 'DEMO-MAT-06', docente: 'demo.docente3' },
  { curso: '1B', materiaCode: 'DEMO-MAT-01', docente: 'demo.docente1' },
  { curso: '1B', materiaCode: 'DEMO-MAT-02', docente: 'demo.docente2' },
  { curso: '1B', materiaCode: 'DEMO-MAT-05', docente: 'demo.docente4' },
  { curso: '2A', materiaCode: 'DEMO-MAT-03', docente: 'demo.docente5' },
  { curso: '2A', materiaCode: 'DEMO-MAT-04', docente: 'demo.docente5' },
  { curso: '2A', materiaCode: 'DEMO-MAT-07', docente: 'demo.docente2' },
  { curso: '2B', materiaCode: 'DEMO-MAT-08', docente: 'demo.docente4' },
  { curso: '2B', materiaCode: 'DEMO-MAT-09', docente: 'demo.docente3' },
  { curso: '2B', materiaCode: 'DEMO-MAT-10', docente: 'demo.docente1' }
];

function notaDeterministica(matriculaId, periodoOrden, semilla) {
  const raw = ((matriculaId * 7 + periodoOrden * 11 + semilla * 13) % 61) / 10 + 4;
  return Number(raw.toFixed(2));
}

async function upsertAnio() {
  return prisma.anioLectivo.upsert({
    where: { anio: DEMO_ANIO },
    update: { estado: 'BORRADOR' },
    create: { anio: DEMO_ANIO, estado: 'BORRADOR' }
  });
}

async function upsertPeriodos(anioId) {
  const defs = [
    { orden: 1, nombre: 'Primer Trimestre' },
    { orden: 2, nombre: 'Segundo Trimestre' },
    { orden: 3, nombre: 'Tercer Trimestre' }
  ];
  const result = [];
  for (const p of defs) {
    const row = await prisma.periodo.upsert({
      where: { anioId_orden: { anioId, orden: p.orden } },
      update: { nombre: p.nombre },
      create: { anioId, orden: p.orden, nombre: p.nombre }
    });
    result.push(row);
  }
  return result;
}

async function upsertCursos(anioId) {
  const result = [];
  for (const nombre of CURSOS) {
    const existing = await prisma.curso.findFirst({ where: { anioId, nombre } });
    if (existing) {
      result.push(existing);
      continue;
    }
    result.push(await prisma.curso.create({ data: { anioId, nombre } }));
  }
  return result;
}

async function upsertMateriasYVersiones(anioId) {
  const result = [];
  for (const m of MATERIAS) {
    const materia = await prisma.materia.upsert({
      where: { codigoBase: m.codigoBase },
      update: { descripcion: m.nombre, activa: true },
      create: { codigoBase: m.codigoBase, descripcion: m.nombre, activa: true }
    });
    const materiaAnual = await prisma.materiaAnual.upsert({
      where: { materiaId_anioId: { materiaId: materia.id, anioId } },
      update: { nombre: m.nombre, cargaHoraria: 4 },
      create: { materiaId: materia.id, anioId, nombre: m.nombre, cargaHoraria: 4 }
    });
    result.push({ materia, materiaAnual });
  }
  return result;
}

async function upsertDocentes(passwordHash) {
  const docentesMap = new Map();
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
    docentesMap.set(d.username, docente);
  }
  return docentesMap;
}

async function upsertAlumnosYMatriculas(cursosMap) {
  const matriculas = [];
  for (const a of ALUMNOS) {
    const alumno = await prisma.alumno.upsert({
      where: { dni: a.dni },
      update: { apellido: a.apellido, nombre: a.nombre, activo: true },
      create: { dni: a.dni, apellido: a.apellido, nombre: a.nombre, activo: true }
    });
    const curso = cursosMap.get(a.curso);
    const matricula = await prisma.matricula.upsert({
      where: { alumnoId_cursoId: { alumnoId: alumno.id, cursoId: curso.id } },
      update: {},
      create: { alumnoId: alumno.id, cursoId: curso.id }
    });
    matriculas.push(matricula);
  }
  return matriculas;
}

async function cleanDemoEvaluaciones() {
  await prisma.notaEvaluacion.deleteMany({
    where: {
      evaluacion: {
        titulo: { startsWith: 'DEMO-' }
      }
    }
  });
  await prisma.evaluacion.deleteMany({
    where: { titulo: { startsWith: 'DEMO-' } }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DOCENTE_PASSWORD, 10);
  const anio = await upsertAnio();
  const periodos = await upsertPeriodos(anio.id);
  const cursos = await upsertCursos(anio.id);
  const materiasVersionadas = await upsertMateriasYVersiones(anio.id);
  const docentesMap = await upsertDocentes(passwordHash);

  const cursosMap = new Map(cursos.map((c) => [c.nombre, c]));
  const materiaAnualPorCodigo = new Map(materiasVersionadas.map((row) => [row.materia.codigoBase, row.materiaAnual]));
  const periodosMap = new Map(periodos.map((p) => [p.orden, p]));

  const matriculas = await upsertAlumnosYMatriculas(cursosMap);
  await cleanDemoEvaluaciones();

  const matriculasPorCurso = new Map();
  for (const m of matriculas) {
    const list = matriculasPorCurso.get(m.cursoId) || [];
    list.push(m);
    matriculasPorCurso.set(m.cursoId, list);
  }

  let evaluacionesCount = 0;
  let notasEvaluacionCount = 0;
  let calificacionesCount = 0;
  let detallesCount = 0;
  let actasCount = 0;

  for (const [idx, asg] of ASIGNACIONES.entries()) {
    const curso = cursosMap.get(asg.curso);
    const materiaAnual = materiaAnualPorCodigo.get(asg.materiaCode);
    const docente = docentesMap.get(asg.docente);
    const matriculasCurso = matriculasPorCurso.get(curso.id) || [];

    const cmd = await prisma.cursoMateriaDocente.upsert({
      where: {
        cursoId_materiaAnualId: {
          cursoId: curso.id,
          materiaAnualId: materiaAnual.id
        }
      },
      update: { docenteId: docente.id, activo: true },
      create: {
        cursoId: curso.id,
        materiaAnualId: materiaAnual.id,
        docenteId: docente.id,
        activo: true
      }
    });

    for (const periodo of periodos) {
      const titulo = `DEMO-${DEMO_ANIO}-${curso.nombre}-${materiaAnual.nombre}-P${periodo.orden}`;
      const evaluacion = await prisma.evaluacion.create({
        data: {
          cursoMateriaDocenteId: cmd.id,
          periodoId: periodo.id,
          tipo: 'PARCIAL',
          fecha: new Date(Date.UTC(DEMO_ANIO, periodo.orden * 2, 10)),
          titulo,
          descripcion: `Evaluacion demo ${curso.nombre} ${materiaAnual.nombre} P${periodo.orden}`,
          ponderacion: 1,
          estado: 'CERRADA'
        }
      });
      evaluacionesCount += 1;

      await prisma.actaTrimestral.upsert({
        where: {
          cursoMateriaDocenteId_periodoId: {
            cursoMateriaDocenteId: cmd.id,
            periodoId: periodo.id
          }
        },
        update: {
          estado: 'ABIERTA',
          fechaCierre: null,
          observaciones: 'Acta demo'
        },
        create: {
          cursoMateriaDocenteId: cmd.id,
          periodoId: periodo.id,
          estado: 'ABIERTA',
          observaciones: 'Acta demo'
        }
      });
      actasCount += 1;

      for (const matricula of matriculasCurso) {
        const notaEval = notaDeterministica(matricula.id, periodo.orden, idx + 1);
        await prisma.notaEvaluacion.upsert({
          where: {
            evaluacionId_matriculaId: {
              evaluacionId: evaluacion.id,
              matriculaId: matricula.id
            }
          },
          update: {
            nota: notaEval,
            observacion: 'Carga demo'
          },
          create: {
            evaluacionId: evaluacion.id,
            matriculaId: matricula.id,
            nota: notaEval,
            observacion: 'Carga demo'
          }
        });
        notasEvaluacionCount += 1;

        const calificacion = await prisma.calificacion.upsert({
          where: {
            matriculaId_materiaAnualId_periodoId: {
              matriculaId: matricula.id,
              materiaAnualId: materiaAnual.id,
              periodoId: periodo.id
            }
          },
          update: {
            nota: notaEval,
            fecha: new Date()
          },
          create: {
            matriculaId: matricula.id,
            materiaAnualId: materiaAnual.id,
            periodoId: periodo.id,
            nota: notaEval,
            fecha: new Date()
          }
        });
        calificacionesCount += 1;

        const detalleData = {
          acompDic: null,
          acompFeb: null,
          alumConAcomp: null,
          notaOrint1erTrim: null,
          nota1erTrimMes1: null,
          nota1erTrimMes2: null,
          nota1erTrimMes3: null,
          recup1erTrim: null,
          observ1erTrim: null,
          notaOrint2doTrim: null,
          nota2doTrimMes1: null,
          nota2doTrimMes2: null,
          nota2doTrimMes3: null,
          recup2doTrim: null,
          observ2doTrim: null,
          notaOrint3erTrim: null,
          nota3erTrimMes1: null,
          nota3erTrimMes2: null,
          nota3erTrimMes3: null,
          recup3erTrim: null,
          observ3erTrim: null
        };

        if (periodo.orden === 1) {
          detalleData.notaOrint1erTrim = notaEval;
          detalleData.nota1erTrimMes1 = notaEval;
        }
        if (periodo.orden === 2) {
          detalleData.notaOrint2doTrim = notaEval;
          detalleData.nota2doTrimMes1 = notaEval;
        }
        if (periodo.orden === 3) {
          detalleData.notaOrint3erTrim = notaEval;
          detalleData.nota3erTrimMes1 = notaEval;
        }

        await prisma.calificacionDetalle.upsert({
          where: { calificacionId: calificacion.id },
          update: detalleData,
          create: {
            calificacionId: calificacion.id,
            ...detalleData
          }
        });
        detallesCount += 1;
      }
    }
  }

  await prisma.logCambio.create({
    data: {
      usuario: 'seed-demo-v2',
      tablaAfectada: 'DEMO_SEED',
      idRegistro: anio.id,
      tipoOperacion: 'INSERT',
      valorAnterior: null,
      valorNuevo: {
        anio: DEMO_ANIO,
        cursos: CURSOS.length,
        materias: MATERIAS.length,
        alumnos: ALUMNOS.length,
        docentes: DOCENTES.length
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        anio: DEMO_ANIO,
        resumen: {
          docentes: DOCENTES.length,
          materias: MATERIAS.length,
          cursos: CURSOS.length,
          alumnos: ALUMNOS.length,
          asignaciones: ASIGNACIONES.length,
          periodos: periodos.length,
          evaluaciones: evaluacionesCount,
          notasEvaluacion: notasEvaluacionCount,
          calificaciones: calificacionesCount,
          detalles: detallesCount,
          actas: actasCount
        },
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
    console.error('Seed demo v2 error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
