const supabase = require('../../config/database');
const { CAMPAIGN_STATUS } = require('../../config/constants');

const list = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = req.user.role === 'admin'
      ? supabase.from('campaigns').select('*').order('created_at', { ascending: false })
      : supabase.from('campaigns').select('*, user_campaigns!inner(user_id)').eq('user_campaigns.user_id', req.user.id).order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    let query = req.user.role === 'admin'
      ? supabase.from('campaigns').select('*').eq('id', req.params.id)
      : supabase.from('campaigns').select('*, user_campaigns!inner(user_id)').eq('id', req.params.id).eq('user_campaigns.user_id', req.user.id);

    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    res.json(data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { 
      name, niche, schedule_type, 
      prompt_template, target_word_count, 
      article_style, target_cpt, target_site_id,
      cron_time, cron_timezone, posts_per_run,
      language, tone, article_config
    } = req.body;

    if (!name || !niche) return res.status(400).json({ error: 'name and niche are required' });
    
    const { data, error } = await supabase.from('campaigns')
      .insert({ 
        name, niche, 
        schedule_type: schedule_type || 'manual', 
        status: CAMPAIGN_STATUS.ACTIVE,
        prompt_template,
        target_word_count: target_word_count || 1500,
        article_style: article_style || 'informative',
        target_cpt: target_cpt || 'post',
        target_site_id,
        cron_time: cron_time || '09:00',
        cron_timezone: cron_timezone || 'Africa/Casablanca',
        posts_per_run: posts_per_run || 1,
        language: language || 'english',
        tone: tone || 'professional',
        article_config: article_config || null
      })
      .select().single();
      
    if (error) throw error;

    // If editor created this campaign, map it so they can see it
    if (req.user.role !== 'admin') {
      await supabase.from('user_campaigns').insert({ user_id: req.user.id, campaign_id: data.id });
    }

    req.app.get('io').emit('campaign:created', data);
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    // check ownership if not admin
    if (req.user.role !== 'admin') {
      const { data: check } = await supabase.from('user_campaigns').select('user_id').eq('campaign_id', req.params.id).eq('user_id', req.user.id).single();
      if (!check) return res.status(403).json({ error: 'Unauthorized to update this campaign' });
    }

    const { data, error } = await supabase.from('campaigns')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('campaign:updated', data);
    res.json(data);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    // check ownership if not admin
    if (req.user.role !== 'admin') {
      const { data: check } = await supabase.from('user_campaigns').select('user_id').eq('campaign_id', req.params.id).eq('user_id', req.user.id).single();
      if (!check) return res.status(403).json({ error: 'Unauthorized to delete this campaign' });
    }

    const { error } = await supabase.from('campaigns').delete().eq('id', req.params.id);
    if (error) throw error;
    req.app.get('io').emit('campaign:deleted', { id: req.params.id });
    res.status(204).send();
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Object.values(CAMPAIGN_STATUS).includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${Object.values(CAMPAIGN_STATUS).join(', ')}` });
    }

    if (req.user.role !== 'admin') {
      const { data: check } = await supabase.from('user_campaigns').select('user_id').eq('campaign_id', req.params.id).eq('user_id', req.user.id).single();
      if (!check) return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase.from('campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('campaign:statusChanged', data);
    res.json(data);
  } catch (err) { next(err); }
};

const bulkImport = async (req, res, next) => {
  try {
    const { campaign: cData, clusters: clustersData } = req.body;
    if (!cData || !cData.name) return res.status(400).json({ error: 'Invalid campaign data' });

    // 1. Create Campaign
    const campaignFields = {
      name: cData.name,
      niche: cData.niche,
      schedule_type: cData.schedule_type || 'manual',
      status: CAMPAIGN_STATUS.ACTIVE,
      prompt_template: cData.prompt_template,
      target_word_count: cData.target_word_count || 1500,
      article_style: cData.article_style || 'informative',
      target_cpt: cData.target_cpt || 'post',
      target_site_id: cData.target_site_id,
      language: cData.language || 'english',
      tone: cData.tone || 'professional',
      article_config: cData.article_config || null
    };

    const { data: campaign, error: cErr } = await supabase.from('campaigns')
      .insert(campaignFields)
      .select().single();
    if (cErr) throw cErr;

    // 2. Create Clusters and Keywords
    if (Array.isArray(clustersData)) {
      for (const cl of clustersData) {
        // Create Cluster
        const { data: cluster, error: clErr } = await supabase.from('clusters')
          .insert({
            campaign_id: campaign.id,
            name: cl.name,
            description: cl.description
          })
          .select().single();
        
        if (!clErr && cluster && Array.isArray(cl.keywords)) {
          // Create Keywords for this cluster
          const keywordsToInsert = cl.keywords.map(k => ({
            campaign_id: campaign.id,
            cluster_id: cluster.id,
            main_keyword: k.main_keyword,
            secondary_keywords: k.secondary_keywords || [],
            intent: k.intent || 'informational',
            difficulty: k.difficulty || 'medium',
            is_pillar: k.is_pillar || false,
            status: 'pending'
          }));
          
          if (keywordsToInsert.length > 0) {
            await supabase.from('keywords').insert(keywordsToInsert);
          }
        }
      }
    }

    req.app.get('io').emit('campaign:created', campaign);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
};

const clearAll = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can clear all campaigns' });
    
    const { error } = await supabase.from('campaigns').delete().not('id', 'is', null);
    if (error) throw error;
    req.app.get('io').emit('campaigns:cleared');
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { list, get, create, update, remove, updateStatus, bulkImport, clearAll };
