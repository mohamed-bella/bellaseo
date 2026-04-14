const supabase = require('../../config/database');

// ─── LOGIN ────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  // We no longer handle login on the backend API! 
  // It's securely handled natively by @supabase/supabase-js on the Next.js frontend.
  res.status(405).json({ error: 'Login handled by Supabase native client on frontend.' });
};

// ─── USER MANAGEMENT (ADMIN ONLY) ──────────────────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    // Admins can see all user profiles
    const { data: profiles, error } = await supabase.from('profiles').select('id, email, role, created_at, updated_at');
    if (error) throw error;

    // Fetch user campaigns for all users
    const { data: mappings, error: mapErr } = await supabase.from('user_campaigns').select('user_id, campaign_id');
    if (mapErr) throw mapErr;

    const populatedUsers = profiles.map(p => ({
      ...p,
      assigned_campaigns: mappings.filter(m => m.user_id === p.id).map(m => m.campaign_id),
    }));

    res.json(populatedUsers);
  } catch (err) { next(err); }
};

const assignCampaigns = async (req, res, next) => {
  try {
    const { id } = req.params; // user_id
    const { campaign_ids } = req.body; // array of UUIDs
    
    if (!Array.isArray(campaign_ids)) return res.status(400).json({ error: 'campaign_ids must be an array' });

    // 1. Delete existing assignments
    await supabase.from('user_campaigns').delete().eq('user_id', id);

    // 2. Insert new assignments
    if (campaign_ids.length > 0) {
      const inserts = campaign_ids.map(cid => ({ user_id: id, campaign_id: cid }));
      const { error } = await supabase.from('user_campaigns').insert(inserts);
      if (error) throw error;
    }

    res.json({ success: true, message: 'Permissions successfully mapped on backend.' });
  } catch (err) { next(err); }
};

const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (role !== 'admin' && role !== 'editor') return res.status(400).json({ error: 'Invalid role' });
    
    // Prevent locking yourself out
    if (id === req.user.id && role === 'editor') {
       return res.status(400).json({ error: 'You cannot demote yourself. Create another Admin first.'});
    }

    const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select('id, email, role').single();
    if (error) throw error;
    res.json(data);
  } catch(err) { next(err); }
}

module.exports = {
  login,
  getUsers,
  assignCampaigns,
  updateRole
};
