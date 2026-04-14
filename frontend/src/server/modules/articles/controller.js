const supabase = require('../../config/database');
const { ARTICLE_STATUS } = require('../../config/constants');
const aiService = require('../../services/aiService');
const wordpressService = require('../../services/wordpressService');
const bloggerService = require('../../services/bloggerService');

async function publishSingleArticle(articleId, io) {
  try {
    const { data: article } = await supabase.from('articles').select('*, keywords!inner(campaign_id)').eq('id', articleId).single();
    if (!article) return;
    
    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', article.keywords.campaign_id).single();
    if (!campaign) {
      console.error('[publishSingleArticle] Campaign not found for article:', articleId);
      return;
    }

    let site;
    if (campaign.target_site_id) {
      const { data } = await supabase.from('sites').select('*').eq('id', campaign.target_site_id).single();
      site = data;
    } 

    if (!site) {
      console.error('[publishSingleArticle] No target site configured for campaign:', campaign.name);
      if (io) io.emit('article:publishError', { articleId, error: 'Target site is not configured for this project. Please edit the project and select a website.' });
      return;
    }

    const cleanArticle = { ...article }; delete cleanArticle.keywords;
    
    let publishResult;
    if (site.type === 'wordpress') {
      publishResult = await wordpressService.publishToWordPress(site, cleanArticle, { status: 'publish', post_type: campaign.target_cpt || 'post', featured_image_url: cleanArticle.featured_image_url });
    } else if (site.type === 'blogger') {
      publishResult = await bloggerService.publishToBlogger(site, cleanArticle, { isDraft: false });
    }

    if (publishResult && publishResult.url) {
      const { data: updated } = await supabase.from('articles')
        .update({ status: ARTICLE_STATUS.PUBLISHED, published_url: publishResult.url, published_at: new Date().toISOString() })
        .eq('id', articleId).select().single();
      if (io) io.emit('article:updated', updated);
      if (io) io.emit('article:statusChanged', updated);
    }
  } catch (e) {
    console.error('[Immediate Publish Failed]:', e.message);
    const errorMsg = e.response?.data?.message || e.message;
    if (io) io.emit('article:publishError', { articleId, error: errorMsg });
  }
}

const list = async (req, res, next) => {
  try {
    const { keyword_id, status, search, campaign_id, has_research } = req.query;
    let query = supabase.from('articles').select('*, keywords!inner(main_keyword, campaign_id, campaigns(name))').order('created_at', { ascending: false });
    
    if (keyword_id) query = query.eq('keyword_id', keyword_id);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('title', `%${search}%`);
    if (campaign_id) query = query.eq('keywords.campaign_id', campaign_id);
    if (has_research) query = query.not('research_data', 'is', null);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('articles')
      .select('*, keywords(main_keyword, secondary_keywords, intent)').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Article not found' });
    res.json(data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { keyword_id, title, content, meta_description } = req.body;
    if (!keyword_id) return res.status(400).json({ error: 'keyword_id is required' });
    const { data, error } = await supabase.from('articles')
      .insert({ keyword_id, title, content, meta_description, status: ARTICLE_STATUS.DRAFT })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('articles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:updated', data);
    res.json(data);
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase.from('articles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:statusChanged', data);
    res.json(data);
  } catch (err) { next(err); }
};

const approve = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('articles')
      .update({ status: ARTICLE_STATUS.APPROVED, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    publishSingleArticle(req.params.id, req.app.get('io'));
    req.app.get('io').emit('article:approved', data);
    res.json(data);
  } catch (err) { next(err); }
};

const reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { data, error } = await supabase.from('articles')
      .update({ status: ARTICLE_STATUS.REJECTED, rejection_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:rejected', data);
    res.json(data);
  } catch (err) { next(err); }
};

const regenerate = async (req, res, next) => {
  try {
    const { prompt_override, target_length, style } = req.body; // Support frontend dynamic regeneration completely
    const { data: article, error: aErr } = await supabase.from('articles')
      .select('*, keywords(*)').eq('id', req.params.id).single();
    if (aErr) throw aErr;
    
    // Pass dynamic configuration to generation service
    const generated = await aiService.generateArticle(article.keywords, {
        promptOverride: prompt_override,
        targetLength: target_length,
        style: style
    });

    const { data, error } = await supabase.from('articles')
      .update({ ...generated, status: ARTICLE_STATUS.REVIEW, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:regenerated', data);
    res.json(data);
  } catch (err) { next(err); }
};

const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const { error } = await supabase.from('articles').delete().in('id', ids);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
};

const bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    const { data, error } = await supabase.from('articles')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids).select('id, status');
    if (error) throw error;
    
    // If approving, trigger immediate background publishing for each
    if (status === ARTICLE_STATUS.APPROVED) {
      ids.forEach(id => publishSingleArticle(id, req.app.get('io')));
    }

    req.app.get('io').emit('articles:bulkStatusChanged', data);
    res.json(data);
  } catch (err) { next(err); }
};

const clearAll = async (req, res, next) => {
  try {
    const { error } = await supabase.from('articles').delete().not('id', 'is', null);
    if (error) throw error;
    req.app.get('io').emit('articles:cleared');
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { 
  list, get, create, update, updateStatus, 
  approve, reject, regenerate, clearAll,
  bulkDelete, bulkUpdateStatus
};
