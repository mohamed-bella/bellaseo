const supabase       = require('../../config/database');
const whatsappService = require('../../services/whatsappService');

const getWhatsappSettings = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('whatsapp_settings').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || { phone_number: '', enabled: false, notify_success: true, notify_errors: true });
  } catch (err) { next(err); }
};

const saveWhatsappSettings = async (req, res, next) => {
  try {
    const { phone_number, enabled, notify_success, notify_errors } = req.body;
    const { data: existing } = await supabase.from('whatsapp_settings').select('id').limit(1).single();

    let result;
    if (existing) {
      result = await supabase.from('whatsapp_settings')
        .update({ phone_number, enabled, notify_success, notify_errors })
        .eq('id', existing.id).select().single();
    } else {
      result = await supabase.from('whatsapp_settings')
        .insert({ phone_number, enabled, notify_success, notify_errors }).select().single();
    }
    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) { next(err); }
};

const testWhatsapp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    await whatsappService.sendMessage(phone, '✅ SEO SaaS — WhatsApp test message received successfully!');
    res.json({ success: true, message: 'Test message sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getWhatsappStatus = async (req, res, next) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (err) { next(err); }
};

/**
 * POST /api/notifications/whatsapp/disconnect
 * Disconnects the active socket but keeps the session files.
 */
const disconnectWhatsapp = async (req, res, next) => {
  try {
    await whatsappService.disconnectSession();
    res.json({ success: true, message: 'WhatsApp session disconnected.' });
  } catch (err) { next(err); }
};

/**
 * POST /api/notifications/whatsapp/delete-session
 * Wipes all session files so the next connect shows a fresh QR.
 */
const deleteWhatsappSession = async (req, res, next) => {
  try {
    await whatsappService.deleteSession();
    res.json({ success: true, message: 'WhatsApp session deleted. Scan a new QR to reconnect.' });
  } catch (err) { next(err); }
};

/**
 * POST /api/notifications/whatsapp/start
 * Starts (or re-starts) the WhatsApp connection.
 */
const startWhatsapp = async (req, res, next) => {
  try {
    await whatsappService.startNewSession();
    res.json({ success: true, message: 'WhatsApp session starting. Check for QR code.' });
  } catch (err) { next(err); }
};
const startPairing = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    const code = await whatsappService.requestPairingCode(phone);
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getWhatsappStatus,
  getWhatsappSettings,
  saveWhatsappSettings,
  testWhatsapp,
  disconnectWhatsapp,
  deleteWhatsappSession,
  startWhatsapp,
  startPairing,
};
