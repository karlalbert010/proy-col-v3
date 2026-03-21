const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const actasPeriodoController = require('./actasPeriodo.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), actasPeriodoController.getActasPeriodo);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), actasPeriodoController.getActaPeriodoById);
router.post('/', authMiddleware, roleMiddleware('ADMIN', 'DIRECTIVO'), actasPeriodoController.createActaPeriodo);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN', 'DIRECTIVO'), actasPeriodoController.updateActaPeriodo);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), actasPeriodoController.deleteActaPeriodo);

module.exports = router;

