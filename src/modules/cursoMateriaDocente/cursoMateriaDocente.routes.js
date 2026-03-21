const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const cursoMateriaDocenteController = require('./cursoMateriaDocente.controller');

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'),
  cursoMateriaDocenteController.getAsignaciones
);

module.exports = router;
