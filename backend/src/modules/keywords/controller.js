const supabase = require('../../config/database');
const { KEYWORD_STATUS } = require('../../config/constants');
const { analyzeKeyword: runAnalysis } = require('../../services/keywordResearchService');

const list = async (req, res, next) => {
  try {
    const { campaign_id, status, search } = req.query;
    let query = supabase.from('keywords').select('*').order('created_at', { ascending: false });
    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('main_keyword', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('keywords').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Keyword not found' });
    res.json(data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { campaign_id, main_keyword, secondary_keywords, intent, difficulty } = req.body;
    if (!campaign_id || !main_keyword) return res.status(400).json({ error: 'campaign_id and main_keyword are required' });
    const { data, error } = await supabase.from('keywords')
      .insert({ campaign_id, main_keyword, secondary_keywords, intent, difficulty, status: KEYWORD_STATUS.PENDING })
      .select().single();
    if (error) throw error;
    req.app.get('io').emit('keyword:created', data);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('keywords')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('keyword:updated', data);
    res.json(data);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from('keywords').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Object.values(KEYWORD_STATUS).includes(status)) {
      return res.status(400).json({ error: `Invalid status` });
    }
    const { data, error } = await supabase.from('keywords')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('keyword:statusChanged', data);
    res.json(data);
  } catch (err) { next(err); }
};

const clearAll = async (req, res, next) => {
  try {
    const { error } = await supabase.from('keywords').delete().not('id', 'is', null);
    if (error) throw error;
    req.app.get('io').emit('keywords:cleared');
    res.status(204).send();
  } catch (err) { next(err); }
};

const analyzeKeyword = async (req, res, next) => {
  try {
    const { keyword } = req.body;
    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({ error: 'A keyword with at least 2 characters is required.' });
    }
    const result = await runAnalysis(keyword.trim());
    res.json(result);
  } catch (err) {
    console.error('[KeywordResearch] Controller error:', err.message);
    next(err);
  }
};

module.exports = { list, get, create, update, remove, updateStatus, clearAll, analyzeKeyword };
