const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const demoController = require('./demo.controller');

const router = express.Router();

router.get('/tablas', authMiddleware, roleMiddleware('ADMIN'), demoController.getTablasDemo);

module.exports = router;
