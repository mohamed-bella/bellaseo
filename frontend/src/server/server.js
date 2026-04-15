const express = require('express');
const next = require('next');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { PORT, CORS_ORIGIN } = require('./config/env');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Route imports
const campaignRoutes = require('./modules/campaigns/router');
const keywordRoutes = require('./modules/keywords/router');
const articleRoutes = require('./modules/articles/router');
const workflowRoutes = require('./modules/workflows/router');
const siteRoutes = require('./modules/sites/router');
const analyticsRoutes = require('./modules/analytics/router');
const logRoutes = require('./modules/logs/router');
const notificationRoutes = require('./modules/notifications/router');
const settingsRoutes = require('./modules/settings/router');
const clusterRoutes = require('./modules/clusters/router');
const radarRoutes = require('./modules/radar/router');
const authRoutes = require('./modules/auth/router');
const { requireAuth } = require('./middleware/auth');
const { initScheduler } = require('./services/schedulerService');
const { initWhatsApp } = require('./services/whatsappService');
const { WHATSAPP_ENABLED } = require('./config/env');

nextApp.prepare().then(() => {
  const app = express();
  const httpServer = http.createServer(app);

  // ─── Socket.IO ────────────────────────────────────────────────────────────────
  const io = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
    destroyUpgrade: false // Crucial: Allows Next.js HMR to function without Socket.IO destroying the connection
  });

  // Manually route Next.js WebSockets since we use a custom server
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/_next')) {
      // Pass Hot Module Reloading to Next.js
      nextApp.getUpgradeHandler()(req, socket, head);
    }
  });

  // Attach io to app so controllers can emit events
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log(`[ws] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[ws] Client disconnected: ${socket.id}`);
    });
  });

  // ─── Middleware ───────────────────────────────────────────────────────────────
  // Note: helmet is disabled for now to avoid issues with Next.js scripts/styles
  // app.use(helmet()); 
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan('dev'));

  // ─── API Routes ───────────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Public Auth
  app.use('/api/auth', authRoutes);

  // Protected application routes
  app.use('/api/campaigns', requireAuth, campaignRoutes);
  app.use('/api/keywords', requireAuth, keywordRoutes);
  app.use('/api/articles', requireAuth, articleRoutes);
  app.use('/api/workflows', requireAuth, workflowRoutes);
  app.use('/api/sites', requireAuth, siteRoutes);
  app.use('/api/logs', requireAuth, logRoutes);
  app.use('/api/notifications', requireAuth, notificationRoutes);
  app.use('/api/settings', requireAuth, settingsRoutes);
  app.use('/api/analytics', requireAuth, analyticsRoutes);
  app.use('/api/clusters', requireAuth, clusterRoutes);
  app.use('/api/radar', requireAuth, radarRoutes);

  // ─── Next.js Handling ─────────────────────────────────────────────────────────
  // Handle all other routes with Next.js
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    const fs = require('fs');
    const path = require('path');
    const errorLog = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\nError: ${err.message}\nStack: ${err.stack}\n\n`;
    try {
      fs.appendFileSync(path.join(__dirname, 'error_debug.log'), errorLog);
    } catch (logErr) {
      console.error('Failed to write to error log:', logErr);
    }

    console.error('[error]', err);
    // Don't leak errors to UI in production
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  // ─── Start ────────────────────────────────────────────────────────────────────
  httpServer.listen(PORT, async () => {
    console.log(`\n🚀 SEO Unified Monolith running on http://localhost:${PORT}`);
    console.log(`   Frontend, Backend, and Socket.IO all synced in one body\n`);
    
    // Start automated cron jobs
    initScheduler();

    // Start WhatsApp engine if enabled
    if (WHATSAPP_ENABLED) {
      console.log('[WhatsApp] Starting Baileys session...');
      try {
        await initWhatsApp(io);
      } catch (waErr) {
        console.error('[WhatsApp] Startup failed:', waErr.message);
      }
    }
  });
});

