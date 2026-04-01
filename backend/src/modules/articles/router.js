const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.post('/:id/regenerate', controller.regenerate);
router.post('/bulk/delete', controller.bulkDelete);
router.post('/bulk/status', controller.bulkUpdateStatus);
router.delete('/bulk/clear', controller.clearAll);

module.exports = router;
