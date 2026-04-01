const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.list);              // ?entity_type=&entity_id=&level=
router.post('/', controller.create);           // Internal use by services

module.exports = router;
