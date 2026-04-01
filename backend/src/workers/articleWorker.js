/**
 * ============================================================
 *  ARTICLE WORKER  — v2 (Apple-Grade Redesign)
 * ============================================================
 *  Cleaner batch processing:
 *  - Uses the v2 aiService.generateArticle signature (no promptOverride arg)
 *  - Options object forwarded cleanly from workflow trigger
 *  - Real-time Socket.IO progress from the AI pipeline
 *  - Structured error recovery per-keyword (never aborts the batch)
 * ============================================================
 */

'use strict';

const supabase        = require('../config/database');
const aiService       = require('../services/aiService');
const { notifyError, notifyWorkflowComplete } = require('../services/whatsappService');
const { WORKFLOW_STATUS, KEYWORD_STATUS, ARTICLE_STATUS, LOG_LEVEL } = require('../config/constants');

async function run(workflowId, campaignId, io, keywordIds = null, options = {}) {
  try {
    // 1. Mark workflow as running
    await updateWorkflow(workflowId, WORKFLOW_STATUS.GENERATING, io);

    // 2. Load campaign
    const { data: campaign, error: cErr } = await supabase
      .from('campaigns').select('*').eq('id', campaignId).single();
    if (cErr || !campaign) throw new Error('Campaign not found.');

    // 3. Fetch target keywords
    let query = supabase
      .from('keywords')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', KEYWORD_STATUS.PENDING);

    if (keywordIds?.length > 0) {
      query = query.in('id', keywordIds);
    } else {
      const batchSize = campaign.posts_per_run || 5;
      query = query.limit(batchSize);
    }

    const { data: keywords, error: kErr } = await query;
    if (kErr) throw kErr;

    if (!keywords || keywords.length === 0) {
      await logEvent(workflowId, LOG_LEVEL.INFO, 'No pending keywords found. Batch skipped.');
      await updateWorkflow(workflowId, WORKFLOW_STATUS.APPROVED, io);
      return;
    }

    await logEvent(workflowId, LOG_LEVEL.INFO, `Starting batch: ${keywords.length} keyword(s).`);

    // 4. Process each keyword
    for (const keyword of keywords) {
      try {
        await logEvent(workflowId, LOG_LEVEL.INFO, `Generating: "${keyword.main_keyword}"`);
        await updateKeywordStatus(keyword.id, KEYWORD_STATUS.IN_PROGRESS, io);

        // Real-time progress forwarded to connected clients
        const onProgress = (msg) => {
          io?.emit('generation:progress', { status: msg, keyword: keyword.main_keyword, timestamp: new Date().toISOString() });
        };

        // Generate article using v2 service
        const generated = await aiService.generateArticle(keyword, options, onProgress);

        // Persist article
        const { data: article, error: aErr } = await supabase.from('articles')
          .insert({
            keyword_id:         keyword.id,
            title:              generated.title,
            slug:               generated.slug,
            content:            generated.content,
            meta_description:   generated.meta_description,
            word_count:         generated.word_count,
            featured_image_url: generated.featured_image_url || null,
            research_data:      generated.research_data      || null,
            status:             ARTICLE_STATUS.DRAFT,
          })
          .select().single();

        if (aErr) throw aErr;

        await updateKeywordStatus(keyword.id, KEYWORD_STATUS.DONE, io);
        io?.emit('article:created', article);
        await logEvent(workflowId, LOG_LEVEL.INFO, `✅ Article saved: "${article.title}"`);

      } catch (err) {
        // Per-keyword failure — log & continue batch
        await updateKeywordStatus(keyword.id, KEYWORD_STATUS.FAILED, io);
        await logEvent(workflowId, LOG_LEVEL.ERROR, `❌ Failed "${keyword.main_keyword}": ${err.message}`);
        await notifyError(`Keyword: ${keyword.main_keyword}`, err.message).catch(() => {});
      }
    }

    // 5. Mark workflow ready for review
    await updateWorkflow(workflowId, WORKFLOW_STATUS.REVIEWING, io);
    await logEvent(workflowId, LOG_LEVEL.INFO, 'Batch complete — articles are ready for review.');
    await notifyWorkflowComplete(campaign.name, 'Article Generation').catch(() => {});

  } catch (globalErr) {
    console.error('[articleWorker] Fatal error:', globalErr);
    await updateWorkflow(workflowId, WORKFLOW_STATUS.FAILED, io);
    await logEvent(workflowId, LOG_LEVEL.ERROR, `Worker failed: ${globalErr.message}`);
    await notifyError(`Worker (workflow ${workflowId})`, globalErr.message).catch(() => {});
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function updateWorkflow(id, status, io) {
  const { data, error } = await supabase.from('workflows')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (!error && io) io.emit('workflow:statusChanged', data);
}

async function updateKeywordStatus(id, status, io) {
  const { data, error } = await supabase.from('keywords')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (!error && io) io.emit('keyword:statusChanged', data);
}

async function logEvent(entity_id, level, message) {
  await supabase.from('logs').insert({ entity_type: 'workflow', entity_id, level, message });
}

// CLI support
if (require.main === module) {
  const [,, workflowId, campaignId] = process.argv;
  if (!workflowId || !campaignId) {
    console.error('Usage: node articleWorker.js <workflowId> <campaignId>');
    process.exit(1);
  }
  run(workflowId, campaignId, null).then(() => process.exit(0));
}

module.exports = { run };
