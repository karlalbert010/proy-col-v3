const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const alumnosController = require('./alumnos.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), alumnosController.getAlumnos);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), alumnosController.getAlumnoById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), alumnosController.createAlumno);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), alumnosController.updateAlumno);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), alumnosController.deleteAlumno);

module.exports = router;
