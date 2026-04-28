const supabase = require('../config/database');
const { API_SECRET } = require('../config/env');

// Memory cache for auth tokens to avoid hitting Supabase too hard on parallel requests
// key: token, value: { user, role, expires }
const authCache = new Map();
const CACHE_TTL = 10000; // 10 seconds

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    
    // Internal API bypass for Cron jobs
    if (token === API_SECRET) {
      req.user = { id: 'system-cron', email: 'cron@system', role: 'admin' };
      return next();
    }

    // Check Cache first
    const cached = authCache.get(token);
    if (cached && cached.expires > Date.now()) {
      req.user = cached.user;
      return next();
    }
    
    // Verify token directly with Supabase Native Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      const reason = error?.message || 'No user found';
      console.warn(`[Auth] Authentication failed for token: ${token.substring(0, 10)}... Error:`, reason);
      
      const fs = require('fs');
      const path = require('path');
      const authErrorLog = `[${new Date().toISOString()}] AUTH_401 ${req.method} ${req.originalUrl}\nToken Start: ${token.substring(0, 10)}\nReason: ${reason}\n\n`;
      fs.appendFileSync(path.join(__dirname, '../error_debug.log'), authErrorLog);

      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    // Now securely fetch their RBAC profile (Admin vs Editor)
    let role = 'editor';
    const { data: profile, error: profileErr } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (profile?.role) {
      role = profile.role;
    } else if (profileErr) {
      console.warn(`Profile lookup failed for user ${user.id}:`, profileErr.message);
    }

    // Attach user payload
    const userPayload = { id: user.id, email: user.email, role: role };
    req.user = userPayload;

    // Save to cache
    authCache.set(token, {
      user: userPayload,
      expires: Date.now() + CACHE_TTL
    });

    // Cleanup old cache items occasionally (if cache gets too big)
    if (authCache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of authCache.entries()) {
        if (v.expires < now) authCache.delete(k);
      }
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    const fs = require('fs');
    const path = require('path');
    const authErrorLog = `[${new Date().toISOString()}] AUTH_ERROR ${req.method} ${req.originalUrl}\nError: ${err.message}\n\n`;
    fs.appendFileSync(path.join(__dirname, '../error_debug.log'), authErrorLog);

    return res.status(401).json({ error: 'Unauthorized: internal error' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};
