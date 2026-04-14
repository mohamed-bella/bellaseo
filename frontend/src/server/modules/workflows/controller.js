const supabase = require('../../config/database');
const { WORKFLOW_STATUS } = require('../../config/constants');
const articleWorker = require('../../workers/articleWorker');
const publishingWorker = require('../../workers/publishingWorker');
const promptEngine = require('../../services/promptEngine');
const settingsService = require('../../services/settingsService');

const getPromptTemplate = async (req, res, next) => {
  try {
    const { campaign_id } = req.query;
    let template = promptEngine.DEFAULT_TEMPLATE;

    if (campaign_id) {
       const { data: campaign } = await supabase.from('campaigns').select('prompt_template').eq('id', campaign_id).single();
       if (campaign?.prompt_template) {
          // If it's a Master Template (contains {{keyword}}), it replaces the whole thing
          if (campaign.prompt_template.includes('{{keyword}}')) {
             template = campaign.prompt_template;
          } else {
             // Otherwise it's just extra instructions
             template = template.replace('{{custom_instructions}}', `Additional Instructions:\n${campaign.prompt_template}`);
          }
       } else {
          template = template.replace('{{custom_instructions}}', '');
       }
    }

    res.json({ template });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { campaign_id, status } = req.query;
    let query = supabase.from('workflows').select('*, campaigns(name)').order('last_run', { ascending: false });
    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('workflows').select('*, campaigns(name)').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Workflow not found' });
    res.json(data);
  } catch (err) { next(err); }
};

const trigger = async (req, res, next) => {
  try {
    const { campaign_id, type, keyword_ids, prompt_override } = req.body;
    if (!campaign_id || !type) return res.status(400).json({ error: 'campaign_id and type are required' });

    // 1. Guard: Ensure campaign has keywords (if no specific keywords are requested)
    let countQuery = supabase.from('keywords').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign_id);
    if (keyword_ids && keyword_ids.length > 0) {
      countQuery = countQuery.in('id', keyword_ids);
    }
    const { count, error: countErr } = await countQuery;
    
    if (countErr) throw countErr;
    if (count === 0) {
      await supabase.from('logs').insert({ 
        entity_type: 'workflow', 
        level: 'error', 
        message: `Failed to trigger ${type}: No keywords found.` 
      });
      return res.status(400).json({ error: 'No keywords found to process. Please assign keywords first.' });
    }

    // 2. Create workflow record
    const { data: workflow, error } = await supabase.from('workflows')
      .insert({ campaign_id, type, status: WORKFLOW_STATUS.PENDING, last_run: new Date().toISOString() })
      .select().single();
    if (error) throw error;

    const io = req.app.get('io');
    io.emit('workflow:started', workflow);

    // Run appropriate worker async
    if (type === 'article_generation') {
      // Forward any runtime generation options from the request body
      const genOptions = {
        target_length:       req.body.target_length,
        tone:                req.body.tone,
        language:            req.body.language,
        include_faq:         req.body.include_faq,
        include_conclusion:  req.body.include_conclusion,
        media_enabled:       req.body.media_enabled,
        external_links_list: req.body.external_links_list,
      };
      articleWorker.run(workflow.id, campaign_id, io, keyword_ids, genOptions).catch(console.error);
    } else if (type === 'publishing') {
      publishingWorker.run(workflow.id, campaign_id, io).catch(console.error);
    }

    res.status(202).json({ message: 'Workflow triggered', workflow });
  } catch (err) { next(err); }
};

const retry = async (req, res, next) => {
  try {
    const { data: workflow, error: wErr } = await supabase.from('workflows')
      .update({ status: WORKFLOW_STATUS.PENDING, last_run: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (wErr) throw wErr;

    const io = req.app.get('io');
    io.emit('workflow:retrying', workflow);

    if (workflow.type === 'article_generation') {
      articleWorker.run(workflow.id, workflow.campaign_id, io).catch(console.error);
    } else if (workflow.type === 'publishing') {
      publishingWorker.run(workflow.id, workflow.campaign_id, io).catch(console.error);
    }

    res.json({ message: 'Workflow retrying', workflow });
  } catch (err) { next(err); }
};

/**
 * Preview the compiled AI prompt for a campaign + test keyword.
 * Does NOT call the AI — just returns the final rendered prompt string.
 */
const previewPrompt = async (req, res, next) => {
  try {
    const { 
      campaign_id, 
      keyword_id, 
      keyword, 
      secondary_keywords = '', 
      intent = 'informational',
      tone,
      target_length,
      include_faq,
      include_conclusion,
      external_links_list
    } = req.query;
    const aiService = require('../../services/aiService');

    let campaign = null;
    if (campaign_id && campaign_id !== 'global') {
      const { data } = await supabase.from('campaigns').select('*').eq('id', campaign_id).single();
      campaign = data;
    }

    let finalKeyword = keyword;
    let finalSecondary = secondary_keywords;
    let finalIntent = intent;

    if (keyword_id && keyword_id !== 'global') {
       const { data: dbKW } = await supabase.from('keywords').select('*').eq('id', keyword_id).single();
       if (dbKW) {
          finalKeyword = dbKW.main_keyword;
          finalSecondary = Array.isArray(dbKW.secondary_keywords) ? dbKW.secondary_keywords.join(', ') : dbKW.secondary_keywords;
          finalIntent = dbKW.intent || 'informational';
       }
    }

    const globalArticleConf = await settingsService.getSetting('article_config') || {};
    const articleConf = aiService.deepMerge(globalArticleConf, campaign?.article_config || {});

    // Use the central buildPrompt logic to ensure preview matches execution
    const compiled = aiService.buildPrompt(
      { main_keyword: finalKeyword, secondary_keywords: finalSecondary, intent: finalIntent },
      campaign,
      null, // site
      articleConf,
      { 
        target_length: target_length || campaign?.target_word_count || articleConf?.content?.target_word_count || 9000,
        tone: tone || '',
        include_faq, 
        include_conclusion 
      },
      '[[RESEARCH CONTEXT WILL BE INJECTED HERE]]',
      '[[INTERNAL LINKS]]',
      external_links_list || '[[EXTERNAL LINKS]]'
    );

    res.json({
      compiled_prompt: compiled,
      params: { targetLength: 9000, keyword: finalKeyword, secondary: finalSecondary }
    });
  } catch (err) { next(err); }
};

/**
 * Generates a full test article live for the Preview Studio.
 * Hits the AI and returns the compiled HTML/Markdown.
 */
const generateTestArticle = async (req, res, next) => {
  try {
    const { 
      campaign_id, 
      keyword_id, 
      keyword, 
      secondary_keywords = '', 
      generation_mode, 
      media_enabled,
      include_faq,
      include_conclusion,
      tone,
      target_length,
      external_links_list
    } = req.body;
    let finalKeywordObj = {
      main_keyword: keyword,
      secondary_keywords: secondary_keywords ? secondary_keywords.split(',').map(s => s.trim()) : [],
      campaign_id: campaign_id === 'global' ? null : campaign_id,
      intent: 'informational',
      id: keyword_id || 'test-live-id'
    };

    if (keyword_id && keyword_id !== 'global') {
       const { data: dbKW } = await supabase.from('keywords').select('*').eq('id', keyword_id).single();
       if (dbKW) finalKeywordObj = dbKW;
    } else {
       finalKeywordObj.main_keyword = keyword || 'test keyword';
    }

    const aiService = require('../../services/aiService');
    const io = req.app.get('io');
    
    const onProgress = (status) => {
      console.log(`[Socket] Emitting progress: ${status}`);
      if (io) {
        io.emit('generation:progress', {
          keyword_id: finalKeywordObj.id,
          status,
          timestamp: new Date().toISOString()
        });
      }
    };

    const article = await aiService.generateArticle(finalKeywordObj, null, { 
      generation_mode, 
      media_enabled,
      include_faq,
      include_conclusion,
      tone,
      target_length,
      external_links_list
    }, onProgress);
    
    res.json({ article });
  } catch (err) { next(err); }
};

module.exports = { list, get, trigger, retry, getPromptTemplate, previewPrompt, generateTestArticle };
