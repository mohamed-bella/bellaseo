const express = require('express');
const router = express.Router();
const radarController = require('./controller');

router.get('/rules', radarController.getRules);
router.post('/rules', radarController.createRule);
router.patch('/rules/:id', radarController.updateRule);
router.delete('/rules/:id', radarController.deleteRule);

router.get('/opportunities', radarController.getOpportunities);
router.post('/scan', radarController.runScan);

module.exports = router;
