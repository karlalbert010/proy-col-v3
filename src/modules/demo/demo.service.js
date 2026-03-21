const prisma = require('../../config/prisma');

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseAnio(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw createHttpError('El parametro anio debe ser numerico.', 400);
  }
  return parsed;
}

async function getTablasDemo({ anio }) {
  const anioValue = parseAnio(anio || process.env.DEMO_ANIO || 2091);
  const anioLectivo = await prisma.anioLectivo.findUnique({
    where: { anio: anioValue }
  });

  if (!anioLectivo) {
    throw createHttpError(`No existe anio lectivo ${anioValue}.`, 404);
  }

  const [
    cursos,
    periodos,
    materiasAnuales,
    matriculas,
    calificaciones,
    calificacionesDetalle,
    usuariosDemo,
    docentes,
    asignaciones,
    evaluaciones,
    notasEvaluacion,
    actas,
    logs
  ] = await Promise.all([
    prisma.curso.findMany({ where: { anioId: anioLectivo.id }, orderBy: { nombre: 'asc' } }),
    prisma.periodo.findMany({ where: { anioId: anioLectivo.id }, orderBy: { orden: 'asc' } }),
    prisma.materiaAnual.findMany({
      where: { anioId: anioLectivo.id },
      include: { materia: true },
      orderBy: { nombre: 'asc' }
    }),
    prisma.matricula.findMany({
      where: { curso: { anioId: anioLectivo.id } },
      include: { alumno: true, curso: true },
      orderBy: [{ curso: { nombre: 'asc' } }, { alumno: { apellido: 'asc' } }, { alumno: { nombre: 'asc' } }]
    }),
    prisma.calificacion.findMany({
      where: { periodo: { anioId: anioLectivo.id } },
      include: {
        matricula: { include: { alumno: true, curso: true } },
        materiaAnual: true,
        periodo: true
      },
      orderBy: { id: 'asc' }
    }),
    prisma.calificacionDetalle.findMany({
      where: { calificacion: { periodo: { anioId: anioLectivo.id } } },
      include: { calificacion: true },
      orderBy: { id: 'asc' }
    }),
    prisma.usuario.findMany({
      where: { username: { startsWith: 'demo.' } },
      orderBy: { username: 'asc' }
    }),
    prisma.docente.findMany({
      where: { usuario: { username: { startsWith: 'demo.' } } },
      include: { usuario: true },
      orderBy: { apellido: 'asc' }
    }),
    prisma.cursoMateriaDocente.findMany({
      where: { materiaAnual: { anioId: anioLectivo.id } },
      include: {
        curso: true,
        materiaAnual: { include: { materia: true } },
        docente: true
      },
      orderBy: { id: 'asc' }
    }),
    prisma.evaluacion.findMany({
      where: { periodo: { anioId: anioLectivo.id } },
      include: {
        periodo: true,
        cursoMateriaDocente: {
          include: {
            curso: true,
            materiaAnual: true,
            docente: true
          }
        }
      },
      orderBy: { id: 'asc' }
    }),
    prisma.notaEvaluacion.findMany({
      where: { evaluacion: { periodo: { anioId: anioLectivo.id } } },
      include: {
        evaluacion: true,
        matricula: { include: { alumno: true, curso: true } }
      },
      orderBy: { id: 'asc' }
    }),
    prisma.actaTrimestral.findMany({
      where: { periodo: { anioId: anioLectivo.id } },
      include: {
        periodo: true,
        cursoMateriaDocente: {
          include: { curso: true, materiaAnual: true, docente: true }
        }
      },
      orderBy: { id: 'asc' }
    }),
    prisma.logCambio.findMany({
      where: { OR: [{ tablaAfectada: 'DEMO_SEED' }, { usuario: 'seed-demo-v2' }] },
      orderBy: { id: 'desc' },
      take: 20
    })
  ]);

  return {
    anioLectivo,
    conteos: {
      cursos: cursos.length,
      periodos: periodos.length,
      materiasAnuales: materiasAnuales.length,
      matriculas: matriculas.length,
      calificaciones: calificaciones.length,
      calificacionesDetalle: calificacionesDetalle.length,
      usuariosDemo: usuariosDemo.length,
      docentes: docentes.length,
      asignaciones: asignaciones.length,
      evaluaciones: evaluaciones.length,
      notasEvaluacion: notasEvaluacion.length,
      actas: actas.length,
      logs: logs.length
    },
    tablas: {
      cursos,
      periodos,
      materiasAnuales,
      matriculas,
      calificaciones,
      calificacionesDetalle,
      usuariosDemo,
      docentes,
      asignaciones,
      evaluaciones,
      notasEvaluacion,
      actas,
      logs
    }
  };
}

module.exports = {
  getTablasDemo
};
