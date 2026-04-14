const fs = require('fs');
const path = require('path');

// Load .env.local if it exists (for local dev)
if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  require('dotenv').config({ path: '.env.local' });
} else {
  // Otherwise load default .env (standard for Docker/Coolify)
  require('dotenv').config();
}

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // AI
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-pro',

  // WordPress
  WP_DEFAULT_USERNAME: process.env.WP_DEFAULT_USERNAME,
  WP_DEFAULT_APP_PASSWORD: process.env.WP_DEFAULT_APP_PASSWORD,

  // Google / Blogger
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback',

  // WhatsApp
  WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED === 'true',
  WHATSAPP_PHONE: process.env.WHATSAPP_PHONE,

  // Security
  API_SECRET: process.env.API_SECRET || 'dev-secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // GSC & GA4
  GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
  GSC_SERVICE_ACCOUNT_JSON: process.env.GSC_SERVICE_ACCOUNT_JSON,
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,

  // ─── E-E-A-T Authority Engine ──────────────────────────────────────────────
  SERPER_API_KEY: process.env.SERPER_API_KEY,           // Serper.dev search API
  GOOGLE_INDEXING_KEY_FILE: process.env.GOOGLE_INDEXING_KEY_FILE, // Path to GCP service account JSON
  GOOGLE_INDEXING_ENABLED: process.env.GOOGLE_INDEXING_ENABLED === 'true', // Opt-in flag
};
