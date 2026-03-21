const express = require('express');

const prisma = require('../../config/prisma');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const estadoMiddleware = require('../../middlewares/estadoMiddleware');
const periodosController = require('./periodos.controller');

const router = express.Router();

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolvePeriodoAnioId(req, _res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
    }

    const record = await prisma.periodo.findUnique({
      where: { id },
      select: { anioId: true }
    });

    if (!record) {
      throw createHttpError('Periodo no encontrado.', 404);
    }

    req.body.anioId = req.body.anioId ?? record.anioId;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), periodosController.getPeriodos);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), periodosController.getPeriodoById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), estadoMiddleware('estructura'), periodosController.createPeriodo);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), resolvePeriodoAnioId, estadoMiddleware('estructura'), periodosController.updatePeriodo);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), resolvePeriodoAnioId, estadoMiddleware('estructura'), periodosController.deletePeriodo);

module.exports = router;
