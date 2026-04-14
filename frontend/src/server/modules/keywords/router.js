const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.list);           // ?campaign_id=&status=
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/bulk/clear', controller.clearAll);
router.delete('/:id', controller.remove);
router.patch('/:id/status', controller.updateStatus);
router.post('/research', controller.analyzeKeyword);  // AI Keyword Research Engine

module.exports = router;
