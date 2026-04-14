/**
 * Publishing Worker
 * Pulls approved articles for a campaign, publishes them to target sites, sends notifications.
 */
const supabase = require('../config/database');
const wordpressService = require('../services/wordpressService');
const bloggerService = require('../services/bloggerService');
const { notifyPublished, notifyError } = require('../services/whatsappService');
const fragmentService = require('../services/fragmentService');
const schemaService = require('../services/schemaService');
const indexingService = require('../services/indexingService');
const { WORKFLOW_STATUS, ARTICLE_STATUS, SITE_TYPE, LOG_LEVEL } = require('../config/constants');

async function run(workflowId, campaignId, io) {
  try {
    // 1. Update workflow status
    await updateWorkflow(workflowId, WORKFLOW_STATUS.PUBLISHING, io);

    // 2. Fetch campaign details to find target site
    const { data: campaign, error: cErr } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
    if (cErr || !campaign) throw new Error('Campaign not found.');

    let targetSite;
    if (campaign.target_site_id) {
       const { data: site } = await supabase.from('sites').select('*').eq('id', campaign.target_site_id).single();
       targetSite = site;
    } 

    if (!targetSite) {
      throw new Error(`Technical configuration issue: Project "${campaign.name}" has no target website selected. Please edit the project and choose a destination site.`);
    }

    if (!targetSite) {
      throw new Error('No target publishing site configured for this campaign.');
    }

    // 3. Fetch approved articles
    const { data: articles, error: aErr } = await supabase.from('articles')
      .select('*, keywords!inner(*)')
      .eq('keywords.campaign_id', campaignId)
      .eq('status', ARTICLE_STATUS.APPROVED)
      .limit(10); // batch size

    if (aErr) throw aErr;

    if (!articles || articles.length === 0) {
      await logEvent(workflowId, LOG_LEVEL.INFO, 'No approved articles found for publishing.');
      await updateWorkflow(workflowId, WORKFLOW_STATUS.PUBLISHED, io);
      return;
    }

    // 4. Process each article
    for (const article of articles) {
      try {
        await logEvent(workflowId, LOG_LEVEL.INFO, `Starting publish for article: ${article.title} to ${targetSite.name}`);
        
        // Remove nested joined data before passing to services
        const cleanArticle = { ...article };
        delete cleanArticle.keywords;

        // ── Pillar 4a: Inject JSON-LD Schema into content before publish ──────
        let articleToPublish = { ...cleanArticle };
        try {
          const { scriptTag, schemas } = await schemaService.buildSchema(cleanArticle, campaign);
          if (scriptTag) {
            articleToPublish.content = cleanArticle.content + '\n\n' + scriptTag;
            // Store schema in DB for reference
            await supabase.from('articles').update({ schema_json: schemas }).eq('id', article.id);
          }
        } catch (schemaErr) {
          console.warn('[publishingWorker] Schema injection failed (non-fatal):', schemaErr.message);
        }

        let publishResult;
        let rankMathKeyword = '';
        if (article.keywords && article.keywords.main_keyword) {
          rankMathKeyword = article.keywords.main_keyword;
          if (article.keywords.secondary_keywords && Array.isArray(article.keywords.secondary_keywords)) {
            rankMathKeyword += ', ' + article.keywords.secondary_keywords.join(', ');
          }
        }

        if (targetSite.type === SITE_TYPE.WORDPRESS) {
            publishResult = await wordpressService.publishToWordPress(targetSite, articleToPublish, { 
              status: 'publish',
              post_type: campaign.target_cpt || 'post',
              featured_image_url: article.featured_image_url,
              rank_math_focus_keyword: rankMathKeyword
            });
        } else if (targetSite.type === SITE_TYPE.BLOGGER) {
            publishResult = await bloggerService.publishToBlogger(targetSite, articleToPublish, { isDraft: false });
        } else {
            throw new Error(`Unsupported site type: ${targetSite.type}`);
        }

        // Persist publish result — including WP media ID if a featured image was uploaded
        const articleUpdate = {
          status: ARTICLE_STATUS.PUBLISHED,
          published_url: publishResult.url,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (publishResult.featured_media_id) {
          articleUpdate.wp_featured_media_id = publishResult.featured_media_id;
          if (publishResult.featured_image_wp_url) {
            articleUpdate.featured_image_url = publishResult.featured_image_wp_url;
          }
        }

        const { data: updatedArticle, error: uErr } = await supabase.from('articles')
          .update(articleUpdate)
          .eq('id', article.id)
          .select().single();
        if (uErr) throw uErr;

        io?.emit('article:statusChanged', updatedArticle);
        await logEvent(workflowId, LOG_LEVEL.INFO, `Successfully published ${article.title}: ${publishResult.url}`);

        // ── Pillar 2: Generate Cross-Platform Fragments ───────────────────────
        const fragments = await fragmentService.generateFragments(updatedArticle);
        if (fragments) {
          await supabase.from('articles').update({ content_fragments: fragments }).eq('id', article.id);
          await logEvent(workflowId, LOG_LEVEL.INFO, `Cross-platform fragments generated for: ${article.title}`);
        }

        // ── Pillar 4b: Google Indexing API (opt-in) ───────────────────────────
        const indexResult = await indexingService.requestIndexing(publishResult.url);
        if (indexResult) {
          await supabase.from('articles')
            .update({ indexing_submitted_at: new Date().toISOString() })
            .eq('id', article.id);
          await logEvent(workflowId, LOG_LEVEL.INFO, `Google Indexing requested for: ${publishResult.url}`);
        }
        
        // Notify WhatsApp
        await notifyPublished(updatedArticle.title, updatedArticle.published_url);

      } catch (err) {
        await logEvent(workflowId, LOG_LEVEL.ERROR, `Failed to publish article ${article.id}: ${err.message}`);
        await notifyError(`Publishing Worker (${article.title})`, err.message);
      }
    }

    // 5. Update workflow to PUBLISHED
    await updateWorkflow(workflowId, WORKFLOW_STATUS.PUBLISHED, io);
    await logEvent(workflowId, LOG_LEVEL.INFO, 'Publishing batch complete. Workflow finished.');
    
    // Final WhatsApp Notification
    const { notifyWorkflowComplete } = require('../services/whatsappService');
    await notifyWorkflowComplete(campaign.name, 'Content Publishing');

  } catch (globalErr) {
    console.error('[publishingWorker] Global error:', globalErr);
    await updateWorkflow(workflowId, WORKFLOW_STATUS.FAILED, io);
    await logEvent(workflowId, LOG_LEVEL.ERROR, `Workflow failed: ${globalErr.message}`);
    await notifyError(`Publishing Worker (Workflow ${workflowId})`, globalErr.message);
  }
}

async function updateWorkflow(id, status, io) {
  const { data, error } = await supabase.from('workflows')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (!error && io) io.emit('workflow:statusChanged', data);
}

async function logEvent(entity_id, level, message) {
  await supabase.from('logs').insert({ entity_type: 'workflow', entity_id, level, message });
}

module.exports = { run };
