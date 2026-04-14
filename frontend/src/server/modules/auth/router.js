const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

// Note: Login is handled via frontend natively to Supabase.

// Admin-only User Profiles & Mapping
router.get('/users', requireAuth, requireAdmin, controller.getUsers);
router.post('/users/:id/assign', requireAuth, requireAdmin, controller.assignCampaigns);
router.put('/users/:id/role', requireAuth, requireAdmin, controller.updateRole);

// Keep disabled login endpoint just for compatibility/error messages for now
router.post('/login', controller.login);

module.exports = router;
