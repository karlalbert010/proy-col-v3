const express = require('express');

const prisma = require('../../config/prisma');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const estadoMiddleware = require('../../middlewares/estadoMiddleware');
const materiasAnualesController = require('./materiasAnuales.controller');

const router = express.Router();

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolveMateriaAnualAnioId(req, _res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
    }

    const record = await prisma.materiaAnual.findUnique({
      where: { id },
      select: { anioId: true }
    });

    if (!record) {
      throw createHttpError('Materia anual no encontrada.', 404);
    }

    req.body.anioId = req.body.anioId ?? record.anioId;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), materiasAnualesController.getMateriasAnuales);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), materiasAnualesController.getMateriaAnualById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), estadoMiddleware('estructura'), materiasAnualesController.createMateriaAnual);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), resolveMateriaAnualAnioId, estadoMiddleware('estructura'), materiasAnualesController.updateMateriaAnual);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), resolveMateriaAnualAnioId, estadoMiddleware('estructura'), materiasAnualesController.deleteMateriaAnual);

module.exports = router;
