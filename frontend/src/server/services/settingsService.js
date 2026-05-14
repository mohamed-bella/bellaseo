const supabase = require('../config/database');

/**
 * Settings Service - Fetches dynamic configuration from the database.
 * Falls back to process.env if not set in DB.
 */
let settingsCache = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

async function getAllSettings() {
  const now = Date.now();
  if (settingsCache && (now - lastFetch < CACHE_TTL)) {
    return settingsCache;
  }

  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) {
    console.error('[Settings] Failed to fetch settings:', error.message);
    return {};
  }

  const settings = data.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  settingsCache = settings;
  lastFetch = now;
  return settings;
}

async function getSetting(key, defaultValue = null) {
  const all = await getAllSettings();
  return all[key] || defaultValue;
}

function invalidateCache() {
  settingsCache = null;
  lastFetch = 0;
}

module.exports = { getAllSettings, getSetting, invalidateCache };
