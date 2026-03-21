const express = require('express');

const prisma = require('../../config/prisma');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const estadoMiddleware = require('../../middlewares/estadoMiddleware');
const calificacionesController = require('./calificaciones.controller');
const calificacionesService = require('./calificaciones.service');

const router = express.Router();

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolveCalificacionAnioIdForCreate(req, _res, next) {
  try {
    const matriculaId = Number(req.body.matriculaId);
    const materiaAnualId = Number(req.body.materiaAnualId);
    const periodoId = Number(req.body.periodoId);

    if (!Number.isInteger(matriculaId) || !Number.isInteger(materiaAnualId) || !Number.isInteger(periodoId)) {
      throw createHttpError('matriculaId, materiaAnualId y periodoId son obligatorios.', 400);
    }

    const refs = await calificacionesService.resolveCreateReferences({
      matriculaId,
      materiaAnualId,
      periodoId
    });

    req.body.anioId = refs.anioId;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function resolveCalificacionAnioIdForUpdate(req, _res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
    }

    const current = await prisma.calificacion.findUnique({
      where: { id },
      select: {
        matriculaId: true,
        materiaAnualId: true,
        periodoId: true
      }
    });

    if (!current) {
      throw createHttpError('Calificacion no encontrada.', 404);
    }

    const refs = await calificacionesService.resolveCreateReferences({
      matriculaId: req.body.matriculaId ?? current.matriculaId,
      materiaAnualId: req.body.materiaAnualId ?? current.materiaAnualId,
      periodoId: req.body.periodoId ?? current.periodoId
    });

    req.body.anioId = refs.anioId;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function resolveCalificacionAnioIdForDelete(req, _res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
    }

    const current = await prisma.calificacion.findUnique({
      where: { id },
      include: {
        periodo: {
          select: {
            anioId: true
          }
        }
      }
    });

    if (!current) {
      throw createHttpError('Calificacion no encontrada.', 404);
    }

    req.body.anioId = current.periodo.anioId;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), calificacionesController.getCalificaciones);
router.get('/resumen', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), calificacionesController.getCalificacionesResumen);
router.post('/importar-calif-alum', authMiddleware, roleMiddleware('ADMIN'), calificacionesController.importFromCalifAlum);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), calificacionesController.getCalificacionById);
router.post('/', authMiddleware, roleMiddleware('DOCENTE'), resolveCalificacionAnioIdForCreate, estadoMiddleware('calificaciones'), calificacionesController.createCalificacion);
router.put('/:id', authMiddleware, roleMiddleware('DOCENTE'), resolveCalificacionAnioIdForUpdate, estadoMiddleware('calificaciones'), calificacionesController.updateCalificacion);
router.delete('/:id', authMiddleware, roleMiddleware('DOCENTE'), resolveCalificacionAnioIdForDelete, estadoMiddleware('calificaciones'), calificacionesController.deleteCalificacion);

module.exports = router;
