const supabase = require('../config/database');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token directly with Supabase Native Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
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
    req.user = { id: user.id, email: user.email, role: role }; 
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
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
