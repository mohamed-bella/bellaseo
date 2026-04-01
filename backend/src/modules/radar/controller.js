const supabase = require('../../config/database');

exports.getRules = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('radar_rules').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

exports.createRule = async (req, res, next) => {
  try {
    const { keywords, platforms, is_active } = req.body;
    const { data, error } = await supabase.from('radar_rules')
      .insert({ keywords, platforms: platforms || ['reddit.com', 'quora.com'], is_active: is_active !== false })
      .select().single();
      
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

exports.updateRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('radar_rules').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

exports.deleteRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('radar_rules').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.getOpportunities = async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = supabase.from('opportunities').select('*, radar_rules(keywords)').order('created_at', { ascending: false }).limit(limit);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const radarWorker = require('../../workers/radarWorker');

exports.runScan = async (req, res, next) => {
  try {
    // Run async to not block the request
    radarWorker.runRadarCycle().catch(console.error);
    res.json({ success: true, message: 'Radar scan initiated background cycle.' });
  } catch (err) { next(err); }
};
