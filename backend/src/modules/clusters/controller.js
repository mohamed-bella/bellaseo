const supabase = require('../../config/database');

const list = async (req, res, next) => {
  try {
    const { campaign_id } = req.query;
    let query = supabase.from('clusters').select('*').order('created_at', { ascending: false });
    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('clusters').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { name, campaign_id, description } = req.body;
    const { data, error } = await supabase.from('clusters')
      .insert({ name, campaign_id, description })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('clusters')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from('clusters').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { list, get, create, update, remove };
