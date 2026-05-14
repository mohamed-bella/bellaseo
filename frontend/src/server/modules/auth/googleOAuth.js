'use strict';

/**
 * Google OAuth2 — System-wide Blogger credentials.
 *
 * One-time admin setup: authorize once → refresh_token saved to system_settings.
 * All Blogger sites use these shared app credentials — no per-site auth needed.
 *
 * Routes (mounted at /auth/google, no /api prefix, no requireAuth):
 *   GET /auth/google/start      → redirect to Google consent screen
 *   GET /auth/google/callback   → exchange code, save tokens, redirect to /settings
 */

const express  = require('express');
const axios    = require('axios');
const env      = require('../../config/env');
const supabase = require('../../config/database');

const router = express.Router();

const AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL     = 'https://oauth2.googleapis.com/token';
const SCOPES        = 'https://www.googleapis.com/auth/blogger';

function getRedirectUri() {
  return env.GOOGLE_REDIRECT_URI || 'https://seo.app.mohamedbella.com/auth/google/callback';
}

// ─── Step 1: Redirect to Google ──────────────────────────────────────────────

router.get('/start', (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(500).send('GOOGLE_CLIENT_ID not set in .env');
  }

  const params = new URLSearchParams({
    client_id:     env.GOOGLE_CLIENT_ID,
    redirect_uri:  getRedirectUri(),
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent', // force consent so refresh_token is always returned
  });

  return res.redirect(`${AUTH_BASE_URL}?${params.toString()}`);
});

// ─── Step 2: Exchange code → save tokens system-wide ─────────────────────────

router.get('/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(`/settings?blogger_oauth=error&reason=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return res.redirect('/settings?blogger_oauth=error&reason=missing_code');
  }

  try {
    const tokenResp = await axios.post(TOKEN_URL, {
      code,
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  getRedirectUri(),
      grant_type:    'authorization_code',
    });

    const { access_token, refresh_token } = tokenResp.data;

    if (!refresh_token) {
      // Shouldn't happen with prompt=consent, but guard anyway
      return res.redirect('/settings?blogger_oauth=error&reason=no_refresh_token_returned');
    }

    // Persist tokens in system_settings — reuse existing upsert pattern
    await supabase.from('system_settings').upsert(
      {
        key:        'google_blogger_tokens',
        value:      JSON.stringify({ access_token, refresh_token }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    // Bust settingsService cache
    try { require('../services/settingsService').invalidateCache?.(); } catch {}

    return res.redirect('/settings?blogger_oauth=success');
  } catch (err) {
    const msg = err.response?.data?.error_description || err.message || 'token_exchange_failed';
    console.error('[googleOAuth] Callback error:', msg);
    return res.redirect(`/settings?blogger_oauth=error&reason=${encodeURIComponent(msg)}`);
  }
});

module.exports = router;
