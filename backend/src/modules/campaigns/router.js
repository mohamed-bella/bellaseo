const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.post('/bulk', controller.bulkImport);
router.delete('/bulk/clear', controller.clearAll);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
