/**
 * Refresh Worker — Living Content Auto-Updater (Pillar 3)
 *
 * Finds articles published more than 90 days ago, checks for new research data
 * via the Research Service, uses the AI to write an "Updated: [Current Date]" section,
 * then re-publishes the update to WordPress.
 *
 * Called by the scheduler (weekly cron). Processes up to 20% of total published count.
 */
const supabase = require('../config/database');
const researchService = require('../services/researchService');
const wordpressService = require('../services/wordpressService');
const settingsService = require('../services/settingsService');
const env = require('../config/env');
const { LOG_LEVEL } = require('../config/constants');
const OpenAI = require('openai');
const axios = require('axios');

/**
 * Run the refresh cycle.
 * @param {Object|null} io — Socket.io instance for real-time events
 */
async function run(io) {
  try {
    console.log('[refreshWorker] Starting Living Content refresh cycle...');

    // ─── 1. Find stale articles (>90 days old, published) ────────────────────
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: allPublished, error: countErr } = await supabase
      .from('articles')
      .select('id', { count: 'exact' })
      .eq('status', 'published')
      .not('published_url', 'is', null);

    if (countErr) throw countErr;

    const totalPublished = allPublished?.length || 0;
    const batchSize = Math.max(1, Math.ceil(totalPublished * 0.20)); // 20% of published

    const { data: staleArticles, error: staleErr } = await supabase
      .from('articles')
      .select('*, keywords(main_keyword, campaign_id, cluster_id)')
      .eq('status', 'published')
      .not('published_url', 'is', null)
      .lte('published_at', ninetyDaysAgo.toISOString())
      .order('published_at', { ascending: true }) // oldest first
      .limit(batchSize);

    if (staleErr) throw staleErr;

    if (!staleArticles || staleArticles.length === 0) {
      console.log('[refreshWorker] No stale articles found for refresh.');
      return;
    }

    console.log(`[refreshWorker] Found ${staleArticles.length} articles to refresh (20% of ${totalPublished} published).`);

    // ─── 2. Process each stale article ───────────────────────────────────────
    for (const article of staleArticles) {
      try {
        const keyword = article.keywords?.main_keyword || article.title;
        console.log(`[refreshWorker] Refreshing: "${article.title}"`);

        // Fetch fresh SERP data
        const freshResearch = await researchService.searchKeyword(keyword);
        if (!freshResearch || freshResearch.organic.length === 0) {
          console.log(`[refreshWorker] No fresh data found for "${article.title}", skipping.`);
          continue;
        }

        // Use AI to write an "Updated" section
        const updateSection = await generateUpdateSection(article, freshResearch);
        if (!updateSection) continue;

        // Append update section to existing content
        const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const updateHtml = `
<hr style="margin: 3rem 0; border-color: #e5e7eb;" />
<div class="content-update" style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 1.5rem 2rem; border-radius: 0 12px 12px 0; margin: 2rem 0;">
  <p style="font-size: 0.75rem; color: #16a34a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">
    ✅ Updated: ${todayStr}
  </p>
  ${updateSection}
</div>`;

        const updatedContent = article.content + updateHtml;

        // Find the target site to re-publish to
        const campaignId = article.keywords?.campaign_id;
        let targetSite = null;
        if (campaignId) {
          const { data: campaign } = await supabase.from('campaigns').select('target_site_id').eq('id', campaignId).single();
          if (campaign?.target_site_id) {
            const { data: site } = await supabase.from('sites').select('*').eq('id', campaign.target_site_id).single();
            targetSite = site;
          }
        }

        // ─── 3. Push update to WordPress (if we have the WP post ID or URL) ───
        let updatePushed = false;
        if (targetSite && targetSite.type === 'wordpress' && article.wp_featured_media_id) {
          // Extract WordPress post ID from published URL or wp_featured_media_id as proxy
          // Primarily use wordpressService.updatePost()
          const wpPostId = await resolveWpPostId(targetSite, article);
          if (wpPostId) {
            await wordpressService.updatePost(targetSite, wpPostId, updatedContent);
            updatePushed = true;
            console.log(`[refreshWorker] ✅ WordPress update pushed for: "${article.title}"`);
          }
        }

        // ─── 4. Persist refresh history ─────────────────────────────────────
        const currentHistory = Array.isArray(article.refresh_history) ? article.refresh_history : [];
        const refreshEntry = {
          refreshedAt: new Date().toISOString(),
          sourcesUsed: freshResearch.organic.length,
          pushedToWordPress: updatePushed,
        };

        await supabase.from('articles').update({
          content: updatedContent,
          research_data: { ...freshResearch, refresh: true },
          updated_at: new Date().toISOString(),
          refresh_history: [...currentHistory, refreshEntry],
        }).eq('id', article.id);

        io?.emit('article:refreshed', { id: article.id, title: article.title });
        await logEvent(article.id, LOG_LEVEL.INFO, `Content refreshed with ${freshResearch.organic.length} new sources.`);

      } catch (err) {
        console.error(`[refreshWorker] Failed to refresh "${article.title}":`, err.message);
        await logEvent(article.id, LOG_LEVEL.ERROR, `Refresh failed: ${err.message}`);
      }
    }

    console.log('[refreshWorker] Refresh cycle complete.');
  } catch (globalErr) {
    console.error('[refreshWorker] Global error:', globalErr.message);
  }
}

/**
 * Generate an "Updated" content section using the AI.
 */
async function generateUpdateSection(article, research) {
  try {
    const config = await settingsService.getSetting('ai_config');
    const keys = await settingsService.getSetting('api_keys');
    const provider = config?.provider || env.AI_PROVIDER;

    const todayYear = new Date().getFullYear();
    const srcSummary = research.organic.slice(0, 3).map((r) => `- ${r.title}: ${r.snippet}`).join('\n');
    const prompt = `You are a senior content editor. Below is the title and some new ${todayYear} research data about this topic. 
Write a concise HTML "Update" section (2-4 short paragraphs, using <p> tags) that adds value to the original article by incorporating the new data. 
Start with: "<h3>What's New in ${todayYear}</h3>"
Be specific. Cite the new sources inline. Do NOT rewrite the whole article. 

ARTICLE TITLE: ${article.title}

NEW RESEARCH DATA:
${srcSummary}

Write ONLY the HTML update section, nothing else:`;

    if (provider === 'gemini') {
      const key = keys?.gemini || env.GEMINI_API_KEY;
      if (!key) return null;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const resp = await axios.post(url, { contents: [{ parts: [{ text: prompt }] }] });
      return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } else {
      const key = keys?.openai || env.OPENAI_API_KEY;
      if (!key) return null;
      const openai = new OpenAI({ apiKey: key });
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      });
      return resp.choices[0].message.content;
    }
  } catch (err) {
    console.warn('[refreshWorker] Update section generation failed:', err.message);
    return null;
  }
}

/**
 * Try to resolve the WordPress numeric post ID from the published URL.
 */
async function resolveWpPostId(site, article) {
  if (!article.published_url) return null;
  try {
    // Try to extract from URL path components (most WP permalinks don't have the ID)
    // so we do a search on WP API using the article slug
    const creds = site.credentials_json ? JSON.parse(site.credentials_json) : {};
    const token = Buffer.from(`${creds.username}:${creds.app_password}`).toString('base64');
    const resp = await axios.get(`${site.api_url}/wp-json/wp/v2/posts`, {
      headers: { Authorization: `Basic ${token}` },
      params: { slug: article.slug, per_page: 1 },
      timeout: 8000,
    });
    return resp.data?.[0]?.id || null;
  } catch {
    return null;
  }
}

async function logEvent(entity_id, level, message) {
  await supabase.from('logs').insert({ entity_type: 'article', entity_id, level, message }).catch(() => {});
}

// CLI support
if (require.main === module) {
  run(null).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { run };
