const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const configEvaluacionController = require('./configEvaluacion.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), configEvaluacionController.getConfigsEvaluacion);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), configEvaluacionController.getConfigEvaluacionById);
router.post('/', authMiddleware, roleMiddleware('ADMIN', 'DIRECTIVO'), configEvaluacionController.createConfigEvaluacion);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN', 'DIRECTIVO'), configEvaluacionController.updateConfigEvaluacion);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), configEvaluacionController.deleteConfigEvaluacion);

module.exports = router;

