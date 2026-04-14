/**
 * WhatsApp Notification Service (Baileys)
 * ─────────────────────────────────────────────────────────────
 * - NO printQRInTerminal (silences deprecated warning)
 * - NO raw Baileys JSON log spam in console
 * - Clean disconnect / delete-session lifecycle
 * - Reconnects only on unexpected drops (not intentional logouts)
 */
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs   = require('fs');
const QRCode  = require('qrcode');
const supabase = require('../config/database');

// Pino logger with WARN level — silences all INFO/DEBUG Baileys spam
const pino = require('pino');
const logger = pino({ level: 'silent' }); // 'warn' keeps only real errors

const SESSION_DIR = path.join(__dirname, '../../.baileys_session');

// ─── Module-level state ────────────────────────────────────────────────────────
let sock            = null;
let isReady         = false;
let currentQr       = null;
let connectedUser   = null;
let ioInstance      = null;
let intentionalStop = false; // true when WE initiated the disconnect — no reconnect
let retryCount      = 0;     // counts consecutive failures to handle 405 loops
let isInitializing  = false; // singleton lock
let isPairingCodeRequested = false; 
let pairingCode     = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function initWhatsApp(io = null) {
  if (io) ioInstance = io;
  if (isInitializing) return; 
  isInitializing = true;

  // Cleanup old instance completely before new one
  if (sock) {
    console.log('[WhatsApp] Cleaning up old socket instance...');
    try {
      sock.ev.removeAllListeners();
      if (sock.ws) sock.ws.close();
    } catch (e) { /* ignore cleanup errors */ }
    sock = null;
  }

  intentionalStop = false;

  try {
    let auth;
    try {
      if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
      auth = await useMultiFileAuthState(SESSION_DIR);
    } catch (authErr) {
      console.error('[WhatsApp] Auth state initialization failed:', authErr.message);
      // If folder exists but is corrupted/missing files, try one reset
      if (fs.existsSync(SESSION_DIR)) {
        console.log('[WhatsApp] Attempting session directory reset...');
        _clearSessionFiles();
        auth = await useMultiFileAuthState(SESSION_DIR);
      } else {
        throw authErr;
      }
    }
    const { state, saveCreds } = auth;
    
    // Stable version fetching with fallback - Using latest confirmed web version
    let version = [2, 3000, 1036420555];
    try {
      const v = await fetchLatestWaWebVersion();
      if (v && v.version) version = v.version;
    } catch { 
      console.warn('[WhatsApp] Using fallback version for compatibility.'); 
    }

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys:  makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      // Standard browser string to avoid 405 handshake errors
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 90000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 30000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
/* QR logic moved below status check to avoid overlap */


      if (connection === 'open') {
        isReady       = true;
        currentQr     = null;
        retryCount    = 0;
        connectedUser = sock.user?.id?.split(':')[0] ?? 'Unknown';
        console.log(`✅ [WhatsApp] Connected as +${connectedUser}`);
        if (ioInstance) ioInstance.emit('whatsapp:status', { connected: true, user: connectedUser });

        try {
          const { data: settings } = await supabase.from('whatsapp_settings').select('*').single();
          if (settings && (!settings.phone_number || settings.phone_number === '')) {
            await supabase.from('whatsapp_settings').update({
              phone_number: connectedUser,
              enabled: true,
            }).eq('id', settings.id);
          }
        } catch {}
      }

      if (qr && !isPairingCodeRequested) {
        currentQr = await QRCode.toDataURL(qr);
        console.log('📱 [WhatsApp] NEW QR code generated.');
        if (ioInstance) ioInstance.emit('whatsapp:qr', { qr: currentQr });
      }
      if (connection === 'close') {
        isReady       = false;
        connectedUser = null;
        if (ioInstance) ioInstance.emit('whatsapp:status', { connected: false, user: null });

        if (intentionalStop) return;

        const statusCode = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode
          : undefined;

        const loggedOut = statusCode === DisconnectReason.loggedOut;
        
        // Don't spam 405 "Restart Required" logs - it's handled by retry logic
        if (statusCode !== 405) {
          console.log(`[WhatsApp] Connection closed (code: ${statusCode ?? 'unknown'}).`);
        }

        if (!loggedOut) {
          retryCount++;
          
          // After 3 consecutive failures, stop completely — user must click Connect again
          if (retryCount > 3) {
            console.error('[WhatsApp] Handshake failed 3x. Stopping auto-reconnect. Click "Connect" to try again.');
            _clearSessionFiles();
            retryCount = 0;
            isInitializing = false;
            intentionalStop = true; // STOP the loop — user must manually re-initiate
            if (ioInstance) ioInstance.emit('whatsapp:status', { connected: false, user: null, error: 'Connection failed after 3 attempts. Please try again.' });
            return; // DO NOT schedule another retry
          }
          
          const delay = Math.min(retryCount * 5000, 15000);
          console.log(`[WhatsApp] Retrying in ${delay / 1000}s (attempt ${retryCount}/3)...`);
          
          // CRITICAL: If we hit a 405 loop, we MUST clear session files before retrying
          if (statusCode === 405) {
            console.log('[WhatsApp] 405 Restart Required detected. Clearing session files to break loop...');
            _clearSessionFiles(); 
          }

          isInitializing = false; // Allow the next init to proceed
          setTimeout(() => initWhatsApp(ioInstance), delay);
        } else {
          console.log('[WhatsApp] Logged out. Clearing session files...');
          _clearSessionFiles();
        }
      }
    });

    isInitializing = false; 
  } catch (err) {
    console.error('[WhatsApp] Initialization error:', err.message);
    isInitializing = false;
    retryCount++;
    if (retryCount > 3) {
      console.error('[WhatsApp] Init failed 3x. Stopping. Click "Connect" to try again.');
      intentionalStop = true;
      retryCount = 0;
      return;
    }
    setTimeout(() => initWhatsApp(ioInstance), 10000); 
  }
}

// ─── SESSION MANAGEMENT ────────────────────────────────────────────────────────

/**
 * Gracefully disconnect the current socket WITHOUT deleting session files.
 * A reconnect will re-authenticate with the existing session automatically.
 */
async function disconnectSession() {
  intentionalStop = true;
  if (sock) {
    try {
      await sock.logout();
    } catch {
      sock.ws?.close();
    }
    sock      = null;
    isReady   = false;
    currentQr = null;
    connectedUser = null;
  }
  if (ioInstance) ioInstance.emit('whatsapp:status', { connected: false, user: null });
  console.log('[WhatsApp] Session disconnected by user.');
}

/**
 * Fully delete the session — clears all auth files and disconnects.
 * Next initWhatsApp() call will show a fresh QR code.
 */
async function deleteSession() {
  intentionalStop = true;
  if (sock) {
    try { await sock.logout(); } catch { sock.ws?.close(); }
    sock      = null;
    isReady   = false;
    currentQr = null;
    connectedUser = null;
  }
  _clearSessionFiles();
  if (ioInstance) ioInstance.emit('whatsapp:status', { connected: false, user: null, sessionDeleted: true });
  console.log('[WhatsApp] Session fully deleted. Scan a new QR to reconnect.');
}

/**
 * Start a fresh session — resets intentionalStop flag and inits.
 */
async function startNewSession(io = null) {
  intentionalStop = false;
  await initWhatsApp(io || ioInstance);
  console.log('[WhatsApp] New session started.');
}

function _clearSessionFiles() {
  try {
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      fs.mkdirSync(SESSION_DIR, { recursive: true });
      console.log(`[WhatsApp] Cleared session directory.`);
    }
  } catch (err) {
    console.error('[WhatsApp] Failed to clear session files:', err.message);
  }
}

// ─── STATUS ───────────────────────────────────────────────────────────────────

function getStatus() {
  return {
    connected:    isReady,
    qr:           currentQr,
    pairingCode:  pairingCode,
    user:         connectedUser,
    sessionExists: fs.existsSync(SESSION_DIR) && fs.readdirSync(SESSION_DIR).length > 0,
  };
}

async function requestPairingCode(phoneNumber) {
  if (!sock) throw new Error('WhatsApp engine not initialized. Click Connect first.');
  if (isReady) throw new Error('WhatsApp is already connected.');
  
  // Clean phone number (numeric only)
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  if (!cleanPhone) throw new Error('Invalid phone number.');

  isPairingCodeRequested = true;
  currentQr = null; // Disable QR while pairing
  
  try {
    // Baileys requires a slight delay after socket init before requesting pairing codes
    await new Promise(r => setTimeout(r, 1500));
    const code = await sock.requestPairingCode(cleanPhone);
    pairingCode = code;
    console.log(`🔑 [WhatsApp] Pairing Code generated for +${cleanPhone}: ${code}`);
    if (ioInstance) ioInstance.emit('whatsapp:pairingCode', { code });
    return code;
  } catch (err) {
    isPairingCodeRequested = false;
    console.error('[WhatsApp] Pairing code error:', err.message);
    throw new Error('Failed to generate pairing code. Ensure number is correct and try again.');
  }
}

// ─── MESSAGING ────────────────────────────────────────────────────────────────

async function sendMessage(phone, message) {
  if (!isReady || !sock) throw new Error('WhatsApp is not connected. Please scan the QR code in Settings → WhatsApp.');
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
  console.log(`[WhatsApp] ✉️  Message sent to +${phone}`);
}

// ─── NOTIFICATION HELPERS ─────────────────────────────────────────────────────

async function _getSettings() {
  const { data } = await supabase.from('whatsapp_settings').select('*').single();
  return data;
}

async function notifyPublished(articleTitle, publishedUrl) {
  try {
    const s = await _getSettings();
    if (!s?.enabled || !s?.notify_success || !s?.phone_number) return;
    const msg = `✅ *SEO Article Published*\n\n📝 *Title:* ${articleTitle}\n🔗 *URL:* ${publishedUrl}\n\n⏰ ${new Date().toLocaleString()}`;
    await sendMessage(s.phone_number, msg);
  } catch (err) { console.error('[WhatsApp] notifyPublished failed:', err.message); }
}

async function notifyWorkflowComplete(campaignName, type) {
  try {
    const s = await _getSettings();
    if (!s?.enabled || !s?.notify_success || !s?.phone_number) return;
    const msg = `🏁 *Workflow Finished*\n\n📈 *Campaign:* ${campaignName}\n⚙️ *Task:* ${type}\n\nAll articles processed successfully! ✨`;
    await sendMessage(s.phone_number, msg);
  } catch (err) { console.error('[WhatsApp] notifyWorkflowComplete failed:', err.message); }
}

async function notifyError(context, errorMessage) {
  try {
    const s = await _getSettings();
    if (!s?.enabled || !s?.notify_errors || !s?.phone_number) return;
    const msg = `❌ *SEO SaaS Error*\n\n📌 *Context:* ${context}\n💬 *Error:* ${errorMessage}\n\n⏰ ${new Date().toLocaleString()}`;
    await sendMessage(s.phone_number, msg);
  } catch (err) { console.error('[WhatsApp] notifyError failed:', err.message); }
}

async function sendLeadAlert(lead) {
  try {
    const s = await _getSettings();
    if (!s?.enabled || !s?.phone_number) return;
    const msg = `🚨 *New Lead Found!*\n\n💡 *Topic:* ${lead.title}\n🌐 *Platform:* ${lead.platform}\n\n💬 *Preview:*\n"${lead.snippet}"\n\n👉 *Reply Here:* ${lead.source_url}\n\n⏰ ${new Date().toLocaleString()}`;
    await sendMessage(s.phone_number, msg);
  } catch (err) { console.error('[WhatsApp] sendLeadAlert failed:', err.message); }
}

module.exports = {
  initWhatsApp,
  disconnectSession,
  deleteSession,
  startNewSession,
  sendMessage,
  notifyPublished,
  notifyError,
  notifyWorkflowComplete,
  sendLeadAlert,
  getStatus,
  requestPairingCode,
};
