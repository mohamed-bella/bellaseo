/**
 * Retry Worker
 * Finds failed workflows and retries them, up to a maximum number of attempts.
 */
const supabase = require('../config/database');
const articleWorker = require('./articleWorker');
const publishingWorker = require('./publishingWorker');
const { notifyError } = require('../services/whatsappService');
const { WORKFLOW_STATUS, LOG_LEVEL } = require('../config/constants');

const MAX_RETRIES = 3;

async function run(io) {
  try {
    console.log('[retryWorker] Scanning for failed workflows...');

    // Find failed workflows
    const { data: workflows, error: wErr } = await supabase.from('workflows')
      .select('*')
      .eq('status', WORKFLOW_STATUS.FAILED);

    if (wErr) throw wErr;

    if (!workflows || workflows.length === 0) {
      console.log('[retryWorker] No failed workflows found.');
      return;
    }

    for (const workflow of workflows) {
      // Check retry count in logs
      const { data: logs, error: lErr } = await supabase.from('logs')
        .select('id')
        .eq('entity_type', 'workflow')
        .eq('entity_id', workflow.id)
        .ilike('message', '%retrying workflow%');
      
      const retryCount = logs ? logs.length : 0;

      if (retryCount >= MAX_RETRIES) {
        // Stop retrying
        await logEvent(workflow.id, LOG_LEVEL.WARN, `Max retries (${MAX_RETRIES}) reached. Giving up.`);
        continue;
      }

      // Retry
      await logEvent(workflow.id, LOG_LEVEL.INFO, `Retrying workflow (Attempt ${retryCount + 1}/${MAX_RETRIES}).`);
      
      const { data: updated, error: uErr } = await supabase.from('workflows')
        .update({ status: WORKFLOW_STATUS.PENDING, last_run: new Date().toISOString() })
        .eq('id', workflow.id).select().single();
        
      if (!uErr && io) io.emit('workflow:retrying', updated);

      if (workflow.type === 'article_generation') {
        articleWorker.run(workflow.id, workflow.campaign_id, io).catch(console.error);
      } else if (workflow.type === 'publishing') {
        publishingWorker.run(workflow.id, workflow.campaign_id, io).catch(console.error);
      }
    }

  } catch (err) {
    console.error('[retryWorker] Global error:', err);
    await notifyError('Retry Worker', err.message);
  }
}

async function logEvent(entity_id, level, message) {
  await supabase.from('logs').insert({ entity_type: 'workflow', entity_id, level, message });
}

// Allow running standalone from CLI (e.g. via cron)
if (require.main === module) {
  run(null).then(() => process.exit(0));
}

module.exports = { run };
