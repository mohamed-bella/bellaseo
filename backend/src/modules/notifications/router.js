const express = require('express');
const router  = express.Router();
const controller = require('./controller');

router.get('/whatsapp',                  controller.getWhatsappSettings);
router.get('/whatsapp/status',           controller.getWhatsappStatus);
router.post('/whatsapp',                 controller.saveWhatsappSettings);
router.post('/whatsapp/test',            controller.testWhatsapp);
router.post('/whatsapp/disconnect',      controller.disconnectWhatsapp);
router.post('/whatsapp/delete-session',  controller.deleteWhatsappSession);
router.post('/whatsapp/start',           controller.startWhatsapp);
router.post('/whatsapp/pair',            controller.startPairing);

module.exports = router;
