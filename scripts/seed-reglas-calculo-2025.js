/* eslint-disable no-console */
const prisma = require('../src/config/prisma');

const TARGET_ANIO = Number(process.env.REGLAS_ANIO || 2025);

async function upsertGlobalRule(anioLectivoId) {
  const existing = await prisma.reglaCalculo.findFirst({
    where: {
      anioLectivoId,
      cursoMateriaDocenteId: null,
      duracion: 'TRIMESTRAL'
    },
    orderBy: { id: 'desc' }
  });

  if (existing) {
    return prisma.reglaCalculo.update({
      where: { id: existing.id },
      data: {
        estrategia: 'MAX_CON_RECUP',
        ponderacionRegular: 1,
        ponderacionRecuperatorio: 1,
        minAprobacion: 6,
        decimales: 2,
        activa: true,
        observaciones: 'Regla global anual: se toma mayor entre base y recuperatorio.'
      }
    });
  }

  return prisma.reglaCalculo.create({
    data: {
      anioLectivoId,
      cursoMateriaDocenteId: null,
      duracion: 'TRIMESTRAL',
      estrategia: 'MAX_CON_RECUP',
      ponderacionRegular: 1,
      ponderacionRecuperatorio: 1,
      minAprobacion: 6,
      decimales: 2,
      activa: true,
      observaciones: 'Regla global anual: se toma mayor entre base y recuperatorio.'
    }
  });
}

async function upsertSpecificRule(anioLectivoId) {
  const cmd = await prisma.cursoMateriaDocente.findFirst({
    where: {
      activo: true,
      curso: { anioId: anioLectivoId },
      materiaAnual: { anioId: anioLectivoId }
    },
    orderBy: { id: 'asc' },
    include: {
      curso: true,
      materiaAnual: true
    }
  });

  if (!cmd) {
    return null;
  }

  const existing = await prisma.reglaCalculo.findFirst({
    where: {
      anioLectivoId,
      cursoMateriaDocenteId: cmd.id,
      duracion: 'TRIMESTRAL'
    },
    orderBy: { id: 'desc' }
  });

  if (existing) {
    const updated = await prisma.reglaCalculo.update({
      where: { id: existing.id },
      data: {
        estrategia: 'PONDERADO',
        ponderacionRegular: 0.7,
        ponderacionRecuperatorio: 0.3,
        minAprobacion: 6,
        decimales: 2,
        activa: true,
        observaciones: 'Regla especifica: ponderado base 70% y recuperatorio 30%.'
      }
    });
    return { regla: updated, cmd };
  }

  const created = await prisma.reglaCalculo.create({
    data: {
      anioLectivoId,
      cursoMateriaDocenteId: cmd.id,
      duracion: 'TRIMESTRAL',
      estrategia: 'PONDERADO',
      ponderacionRegular: 0.7,
      ponderacionRecuperatorio: 0.3,
      minAprobacion: 6,
      decimales: 2,
      activa: true,
      observaciones: 'Regla especifica: ponderado base 70% y recuperatorio 30%.'
    }
  });

  return { regla: created, cmd };
}

async function main() {
  const anio = await prisma.anioLectivo.findFirst({
    where: { anio: TARGET_ANIO }
  });

  if (!anio) {
    throw new Error(`No existe AnioLectivo para anio ${TARGET_ANIO}.`);
  }

  const globalRule = await upsertGlobalRule(anio.id);
  const specificResult = await upsertSpecificRule(anio.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        anio: TARGET_ANIO,
        anioLectivoId: anio.id,
        globalRule: {
          id: globalRule.id,
          estrategia: globalRule.estrategia,
          duracion: globalRule.duracion
        },
        specificRule: specificResult
          ? {
              id: specificResult.regla.id,
              estrategia: specificResult.regla.estrategia,
              cursoMateriaDocenteId: specificResult.regla.cursoMateriaDocenteId,
              curso: specificResult.cmd.curso.nombre,
              materiaAnual: specificResult.cmd.materiaAnual.nombre
            }
          : null
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Seed reglas calculo error:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

