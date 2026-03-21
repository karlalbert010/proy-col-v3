const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const logCambiosController = require('./logCambios.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN'), logCambiosController.getLogCambios);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN'), logCambiosController.getLogCambioById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), logCambiosController.createLogCambio);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), logCambiosController.updateLogCambio);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), logCambiosController.deleteLogCambio);

module.exports = router;
