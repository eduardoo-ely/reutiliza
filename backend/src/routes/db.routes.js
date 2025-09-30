const express = require('express');
const router = express.Router();
const dbController = require('../controllers/db.controller');

// Rota para verificar a conexão com o banco de dados
router.get('/status', dbController.checkDbConnection);

// Rota para inicializar o banco de dados
router.post('/initialize', dbController.initializeDatabase);

module.exports = router;