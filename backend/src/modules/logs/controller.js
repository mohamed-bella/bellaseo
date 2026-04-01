const supabase = require('../../config/database');

const list = async (req, res, next) => {
  try {
    const { entity_type, entity_id, level, limit = 100 } = req.query;
    let query = supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(parseInt(limit));
    if (entity_type) query = query.eq('entity_type', entity_type);
    if (entity_id) query = query.eq('entity_id', entity_id);
    if (level) query = query.eq('level', level);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { entity_type, entity_id, level, message } = req.body;
    const { data, error } = await supabase.from('logs')
      .insert({ entity_type, entity_id, level: level || 'info', message }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

module.exports = { list, create };
