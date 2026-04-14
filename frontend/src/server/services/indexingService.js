/**
 * Google Indexing API Service (Pillar 4 — Opt-In)
 *
 * Submits a newly published URL to the Google Indexing API so it's crawled
 * and indexed within minutes rather than days.
 *
 * REQUIRES: GOOGLE_INDEXING_ENABLED=true in .env and a service account JSON key
 * at the path specified in GOOGLE_INDEXING_KEY_FILE with the Indexing API enabled.
 *
 * Ref: https://developers.google.com/search/apis/indexing-api/v3/quickstart
 */
const fs = require('fs');
const axios = require('axios');
const env = require('../config/env');

/**
 * Get a Google OAuth2 access token from a service account key file.
 */
async function getAccessToken(keyFilePath) {
  // Minimal JWT-based OAuth2 for Google APIs (avoids heavy googleapis dependency for this use case)
  const { google } = require('googleapis');
  const keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: keyData,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  const client = await auth.getClient();
  const tokenResp = await client.getAccessToken();
  return tokenResp.token;
}

/**
 * Request Google to index (or re-index) a URL.
 * @param {string} url — The public URL of the published article
 * @param {'URL_UPDATED'|'URL_DELETED'} type — Default: URL_UPDATED
 * @returns {{ status: string, notifyTime?: string } | null}
 */
async function requestIndexing(url, type = 'URL_UPDATED') {
  // ── Guard: Only run if explicitly enabled in .env ─────────────────────────
  if (!env.GOOGLE_INDEXING_ENABLED) {
    console.log('[indexing] Google Indexing API is disabled (set GOOGLE_INDEXING_ENABLED=true to activate).');
    return null;
  }

  if (!env.GOOGLE_INDEXING_KEY_FILE) {
    console.warn('[indexing] GOOGLE_INDEXING_KEY_FILE not set — skipping auto-indexing.');
    return null;
  }

  if (!fs.existsSync(env.GOOGLE_INDEXING_KEY_FILE)) {
    console.warn(`[indexing] Key file not found: ${env.GOOGLE_INDEXING_KEY_FILE}`);
    return null;
  }

  try {
    console.log(`[indexing] Requesting Google indexing for: ${url}`);
    const token = await getAccessToken(env.GOOGLE_INDEXING_KEY_FILE);

    const response = await axios.post(
      'https://indexing.googleapis.com/v3/urlNotifications:publish',
      { url, type },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const result = {
      status: 'submitted',
      notifyTime: response.data?.urlNotificationMetadata?.latestUpdate?.notifyTime || null,
      url,
    };
    console.log(`[indexing] ✅ Indexing request accepted for: ${url}`);
    return result;
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error(`[indexing] ⚠️ Indexing request failed for ${url}:`, errMsg);
    return null; // Non-fatal — publishing still succeeds
  }
}

module.exports = { requestIndexing };
