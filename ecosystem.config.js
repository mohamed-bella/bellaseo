module.exports = {
  apps: [
    {
      name: 'seo-saas-backend',
      script: 'src/server.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 4004,
        // Allow the production frontend domain to call the API
        CORS_ORIGIN: 'https://seo.dev.mohamedbella.com'
      },
      instances: 1,
      exec_mode: 'fork',

      // ── Crash Protection ────────────────────────────────────────
      max_restarts: 10,          // Stop trying after 10 crashes
      min_uptime: '10s',         // Must stay up 10s to count as healthy
      restart_delay: 5000,       // Wait 5s before restarting on crash
      kill_timeout: 5000,        // Wait 5s for graceful shutdown

      // ── Logging ─────────────────────────────────────────────────
      out_file: '/root/.pm2/logs/seo-saas-backend-out.log',
      error_file: '/root/.pm2/logs/seo-saas-backend-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'seo-saas-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        // Must match the Caddy reverse_proxy port: seo.dev.mohamedbella.com → localhost:3002
        PORT: 3002
      },

      // ── Crash Protection ────────────────────────────────────────
      max_restarts: 10,
      min_uptime: '15s',
      restart_delay: 5000,
      kill_timeout: 8000,

      // ── Logging ─────────────────────────────────────────────────
      out_file: '/root/.pm2/logs/seo-saas-frontend-out.log',
      error_file: '/root/.pm2/logs/seo-saas-frontend-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
};
