const express = require('express');
const router = express.Router();
const controller = require('./controller');

// ─── Analytics Routes ──────────────────────────────────────────────────────────

router.get('/overview', controller.getOverview);
router.get('/test', controller.testConnection);

module.exports = router;
