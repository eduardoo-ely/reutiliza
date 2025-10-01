const express = require('express');
const router = express.Router();
const dbController = require('../controllers/db.controller');

router.get('/status', dbController.checkDbConnection);
router.post('/initialize', dbController.initializeDatabase);

module.exports = router;
