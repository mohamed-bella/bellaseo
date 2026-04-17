const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/stats', controller.stats);

module.exports = router;
