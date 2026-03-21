const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const matriculasController = require('./matriculas.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), matriculasController.getMatriculas);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'), matriculasController.getMatriculaById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), matriculasController.createMatricula);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), matriculasController.updateMatricula);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), matriculasController.deleteMatricula);

module.exports = router;
