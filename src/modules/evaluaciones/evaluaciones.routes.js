const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const evaluacionesController = require('./evaluaciones.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), evaluacionesController.getEvaluaciones);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), evaluacionesController.getEvaluacionById);
router.post('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), evaluacionesController.createEvaluacion);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), evaluacionesController.updateEvaluacion);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN', 'DIRECTIVO'), evaluacionesController.deleteEvaluacion);

module.exports = router;

