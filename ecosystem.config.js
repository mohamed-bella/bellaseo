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
      exec_mode: 'fork'
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
      }
    }
  ]
};
