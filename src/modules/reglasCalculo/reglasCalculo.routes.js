const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const reglasCalculoController = require('./reglasCalculo.controller');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('ADMIN', 'DIRECTIVO'), reglasCalculoController.getReglasCalculo);
router.get('/:id', authMiddleware, roleMiddleware('ADMIN', 'DIRECTIVO'), reglasCalculoController.getReglaCalculoById);
router.post('/', authMiddleware, roleMiddleware('ADMIN'), reglasCalculoController.createReglaCalculo);
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), reglasCalculoController.updateReglaCalculo);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), reglasCalculoController.deleteReglaCalculo);

module.exports = router;

