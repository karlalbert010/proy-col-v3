const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const asistenciaController = require('./asistencia.controller');

const router = express.Router();

router.get(
  '/contexto',
  authMiddleware,
  roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'),
  asistenciaController.getContexto
);
router.post(
  '/guardar',
  authMiddleware,
  roleMiddleware('ADMIN', 'DOCENTE', 'DIRECTIVO'),
  asistenciaController.guardarAsistencia
);

module.exports = router;

