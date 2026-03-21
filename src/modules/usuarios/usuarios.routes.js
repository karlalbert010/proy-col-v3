const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const usuariosController = require('./usuarios.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN'), usuariosController.getUsuarios);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN'), usuariosController.getUsuarioById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), usuariosController.createUsuario);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), usuariosController.updateUsuario);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), usuariosController.deleteUsuario);

module.exports = router;
