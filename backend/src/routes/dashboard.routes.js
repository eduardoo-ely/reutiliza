const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// Rotas de dashboard

router.get('/usuario/:usuarioId', dashboardController.getDashboardUsuario);
router.get('/admin', dashboardController.getDashboardAdmin);
router.get('/impacto', dashboardController.getImpactoAmbiental);

module.exports = router;