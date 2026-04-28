const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/test', controller.testConnection);
router.post('/:id/test-post', controller.publishTestPost);
router.delete('/:id/test-post', controller.deleteTestPost);
router.get('/:id/post-types', controller.getPostTypes);
router.get('/:id/diagnostics', controller.getDiagnostics);
router.get('/:id/posts', controller.getPosts);

module.exports = router;
