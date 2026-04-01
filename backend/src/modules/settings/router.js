const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.getSettings);
router.post('/', controller.updateSettings);

module.exports = router;
