const express = require('express');

const prisma = require('../../config/prisma');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const estadoMiddleware = require('../../middlewares/estadoMiddleware');
const calificacionesDetalleController = require('./calificacionesDetalle.controller');

const router = express.Router();

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolveCalificacionAnioIdFromCalificacionId(req, _res, next) {
  try {
    const calificacionId = Number(req.body.calificacionId);

    if (!Number.isInteger(calificacionId) || calificacionId <= 0) {
      throw createHttpError('El campo calificacionId es obligatorio y debe ser entero positivo.', 400);
    }

    const calificacion = await prisma.calificacion.findUnique({
      where: { id: calificacionId },
      include: {
        periodo: {
          select: {
            anioId: true
          }
        }
      }
    });

    if (!calificacion) {
      throw createHttpError('Calificacion no encontrada.', 404);
    }

    req.body.anioId = calificacion.periodo.anioId;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function resolveCalificacionAnioIdFromDetalleId(req, _res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createHttpError('El parametro id debe ser un numero entero valido.', 400);
    }

    const detalle = await prisma.calificacionDetalle.findUnique({
      where: { id },
      include: {
        calificacion: {
          include: {
            periodo: {
              select: {
                anioId: true
              }
            }
          }
        }
      }
    });

    if (!detalle) {
      throw createHttpError('CalificacionDetalle no encontrado.', 404);
    }

    req.body.anioId = detalle.calificacion.periodo.anioId;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), calificacionesDetalleController.getCalificacionesDetalle);
router.get('/comparar-view', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), calificacionesDetalleController.compareCalificacionWithView);
router.get('/vista-trimestral', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), calificacionesDetalleController.getCalificacionesTrimestralesView);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), calificacionesDetalleController.getCalificacionDetalleById);
router.post('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE'), resolveCalificacionAnioIdFromCalificacionId, estadoMiddleware('calificaciones'), calificacionesDetalleController.createCalificacionDetalle);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE'), resolveCalificacionAnioIdFromDetalleId, estadoMiddleware('calificaciones'), calificacionesDetalleController.updateCalificacionDetalle);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE'), resolveCalificacionAnioIdFromDetalleId, estadoMiddleware('calificaciones'), calificacionesDetalleController.deleteCalificacionDetalle);

module.exports = router;
