/* eslint-disable no-console */
const prisma = require('../src/config/prisma');

const TARGET_ANIO = Number(process.env.SEED_ANIO || 2025);

function noteDeterministica(matriculaId, configId) {
  const raw = ((matriculaId * 17 + configId * 11) % 61) / 10 + 4;
  return Number(raw.toFixed(2));
}

function buildFecha(anio, mes, day = 10) {
  const safeMes = Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : 3;
  return new Date(Date.UTC(anio, safeMes - 1, day));
}

async function upsertEvaluacionBase(config) {
  const titulo = `CFG-${config.id}-${config.tipo}-P${config.periodo.orden}`;
  const fecha = buildFecha(TARGET_ANIO, config.mes || config.periodo.orden * 3, 10);

  const existing = await prisma.evaluacion.findFirst({
    where: {
      configEvaluacionId: config.id,
      evaluacionPadreId: null,
      tipo: config.tipo
    }
  });

  if (existing) {
    return prisma.evaluacion.update({
      where: { id: existing.id },
      data: {
        cursoMateriaDocenteId: config.cursoMateriaDocenteId,
        periodoId: config.periodoId,
        fecha,
        titulo,
        descripcion: `Evaluacion creada desde ConfigEvaluacion ${config.id}.`,
        ponderacion: config.ponderacion ?? 1,
        estado: 'ABIERTA'
      }
    });
  }

  return prisma.evaluacion.create({
    data: {
      cursoMateriaDocenteId: config.cursoMateriaDocenteId,
      periodoId: config.periodoId,
      configEvaluacionId: config.id,
      evaluacionPadreId: null,
      tipo: config.tipo,
      fecha,
      titulo,
      descripcion: `Evaluacion creada desde ConfigEvaluacion ${config.id}.`,
      ponderacion: config.ponderacion ?? 1,
      estado: 'ABIERTA'
    }
  });
}

async function upsertRecuperatorio(config, evaluacionPadreId) {
  const titulo = `CFG-${config.id}-RECUPERATORIO-P${config.periodo.orden}`;
  const fecha = buildFecha(TARGET_ANIO, config.mes || config.periodo.orden * 3, 25);

  const existing = await prisma.evaluacion.findFirst({
    where: {
      evaluacionPadreId,
      tipo: 'RECUPERATORIO'
    }
  });

  if (existing) {
    return prisma.evaluacion.update({
      where: { id: existing.id },
      data: {
        cursoMateriaDocenteId: config.cursoMateriaDocenteId,
        periodoId: config.periodoId,
        fecha,
        titulo,
        descripcion: `Recuperatorio creado desde ConfigEvaluacion ${config.id}.`,
        ponderacion: config.ponderacion ?? 1,
        estado: 'ABIERTA'
      }
    });
  }

  return prisma.evaluacion.create({
    data: {
      cursoMateriaDocenteId: config.cursoMateriaDocenteId,
      periodoId: config.periodoId,
      configEvaluacionId: config.id,
      evaluacionPadreId,
      tipo: 'RECUPERATORIO',
      fecha,
      titulo,
      descripcion: `Recuperatorio creado desde ConfigEvaluacion ${config.id}.`,
      ponderacion: config.ponderacion ?? 1,
      estado: 'ABIERTA'
    }
  });
}

async function upsertNotas(evaluacionId, matriculas, configId, forRecuperatorio = false) {
  let total = 0;

  for (const matricula of matriculas) {
    const base = noteDeterministica(matricula.id, configId);
    const nota = forRecuperatorio ? (base < 6 ? Number(Math.max(6, base + 2).toFixed(2)) : null) : base;

    await prisma.notaEvaluacion.upsert({
      where: {
        evaluacionId_matriculaId: {
          evaluacionId,
          matriculaId: matricula.id
        }
      },
      update: {
        nota,
        observacion: forRecuperatorio
          ? 'Carga automatica recuperatorio desde config.'
          : 'Carga automatica base desde config.'
      },
      create: {
        evaluacionId,
        matriculaId: matricula.id,
        nota,
        observacion: forRecuperatorio
          ? 'Carga automatica recuperatorio desde config.'
          : 'Carga automatica base desde config.'
      }
    });

    total += 1;
  }

  return total;
}

async function main() {
  const configs = await prisma.configEvaluacion.findMany({
    where: {
      periodo: {
        anio: {
          anio: TARGET_ANIO
        }
      }
    },
    include: {
      periodo: true,
      cursoMateriaDocente: {
        include: {
          curso: true
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  let evaluacionesBase = 0;
  let evaluacionesRecup = 0;
  let notas = 0;

  for (const config of configs) {
    const evaluacionBase = await upsertEvaluacionBase(config);
    evaluacionesBase += 1;

    const matriculas = await prisma.matricula.findMany({
      where: { cursoId: config.cursoMateriaDocente.cursoId }
    });

    notas += await upsertNotas(evaluacionBase.id, matriculas, config.id, false);

    if (config.recuperatorioHabilitado) {
      const recup = await upsertRecuperatorio(config, evaluacionBase.id);
      evaluacionesRecup += 1;
      notas += await upsertNotas(recup.id, matriculas, config.id, true);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        anio: TARGET_ANIO,
        configsProcesadas: configs.length,
        evaluacionesBase,
        evaluacionesRecuperatorio: evaluacionesRecup,
        notas
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Seed evaluaciones from config error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

