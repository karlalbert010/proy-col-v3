const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const materiasController = require('./materias.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), materiasController.getMaterias);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), materiasController.getMateriaById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), materiasController.createMateria);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), materiasController.updateMateria);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), materiasController.deleteMateria);

module.exports = router;
