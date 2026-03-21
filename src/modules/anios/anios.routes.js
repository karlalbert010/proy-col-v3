const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const aniosController = require('./anios.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), aniosController.getAnios);
router.get('/actual', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), aniosController.getAnioActual);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), aniosController.getAnioById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), aniosController.createAnio);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), aniosController.updateAnio);
router.patch('/:id/estado', authMiddleware, roleMiddleware('ADMIN'), aniosController.updateEstado);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), aniosController.deleteAnio);

module.exports = router;
