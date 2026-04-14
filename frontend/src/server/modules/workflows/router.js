const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/prompt-template', controller.getPromptTemplate);
router.get('/preview-prompt', controller.previewPrompt);
router.post('/generate-test', controller.generateTestArticle);
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/trigger', controller.trigger);    // Manually trigger a workflow
router.patch('/:id/retry', controller.retry);

module.exports = router;
