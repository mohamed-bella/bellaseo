'use strict';

/**
 * Google OAuth2 — One-click Blogger connect.
 *
 * Uses APP-level credentials from env (no per-user Google Cloud setup needed).
 * Flow:
 *   1. GET /auth/google/start          → redirect to Google consent
 *   2. GET /auth/google/callback       → exchange code, fetch user's blogs, redirect to /sites with data
 */

const express  = require('express');
const axios    = require('axios');
const env      = require('../../config/env');

const router = express.Router();

const AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL     = 'https://oauth2.googleapis.com/token';
const BLOGGER_API   = 'https://www.googleapis.com/blogger/v3';
const SCOPES        = 'https://www.googleapis.com/auth/blogger';

function getRedirectUri() {
  return env.GOOGLE_REDIRECT_URI || 'https://seo.app.mohamedbella.com/auth/google/callback';
}

// ─── Step 1: Start OAuth ──────────────────────────────────────────────────────

router.get('/start', (req, res) => {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send(
      'GOOGLE_CLIENT_ID not set in environment. Add it to your .env file.'
    );
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  getRedirectUri(),
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
  });

  return res.redirect(`${AUTH_BASE_URL}?${params.toString()}`);
});

// ─── Step 2: Callback — exchange code, fetch blogs, pass to frontend ─────────

router.get('/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(`/sites?blogger_oauth=error&reason=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return res.redirect('/sites?blogger_oauth=error&reason=missing_code');
  }

  try {
    // Exchange code for tokens
    const tokenResp = await axios.post(TOKEN_URL, {
      code,
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  getRedirectUri(),
      grant_type:    'authorization_code',
    });

    const { access_token, refresh_token } = tokenResp.data;

    // Fetch the user's Blogger blogs
    const blogsResp = await axios.get(`${BLOGGER_API}/users/self/blogs`, {
      headers: { Authorization: `Bearer ${access_token}` },
      timeout: 10000,
    });

    const blogs = (blogsResp.data.items || []).map(b => ({
      id:          b.id,
      name:        b.name,
      url:         b.url,
      description: b.description || '',
      posts:       b.posts?.totalItems || 0,
    }));

    // Pass everything to frontend via base64-encoded query param
    const payload = Buffer.from(JSON.stringify({
      access_token,
      refresh_token: refresh_token || null,
      blogs,
    })).toString('base64url');

    return res.redirect(`/sites?blogger_oauth=pick&data=${payload}`);

  } catch (err) {
    const msg = err.response?.data?.error_description || err.message || 'token_exchange_failed';
    console.error('[googleOAuth] Callback error:', msg);
    return res.redirect(`/sites?blogger_oauth=error&reason=${encodeURIComponent(msg)}`);
  }
});

module.exports = router;
