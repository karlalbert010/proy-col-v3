const prisma = require('../config/prisma');

async function auditLogger({
  usuario,
  tablaAfectada,
  idRegistro,
  tipoOperacion,
  valorAnterior = null,
  valorNuevo = null,
  prismaClient = prisma
}) {
  return prismaClient.logCambio.create({
    data: {
      usuario,
      tablaAfectada,
      idRegistro,
      tipoOperacion,
      valorAnterior,
      valorNuevo
    }
  });
}

module.exports = auditLogger;
