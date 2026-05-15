const supabase = require('../../config/database');

const stats = async (req, res, next) => {
  try {
    const [campaigns, keywords, articles, sites, workflows, recentLogs, waStatus, apiKeys] = await Promise.all([
      supabase.from('campaigns').select('id', { count: 'exact', head: true }),
      supabase.from('keywords').select('id', { count: 'exact', head: true }),
      supabase.from('articles').select('id, status', { count: 'exact' }).limit(2000),
      supabase.from('sites').select('id', { count: 'exact', head: true }),
      supabase.from('workflows')
        .select('id, status, type, last_run, campaigns(name)')
        .in('status', ['generating', 'publishing', 'pending'])
        .order('last_run', { ascending: false })
        .limit(10),
      supabase.from('logs')
        .select('id, level, message, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase.from('system_settings').select('value').eq('key', 'whatsapp_status').maybeSingle(),
      supabase.from('system_settings').select('value').eq('key', 'api_keys').maybeSingle(),
    ]);

    // Log any query errors to server console so issues are visible
    const queryResults = { campaigns, keywords, articles, sites, workflows, recentLogs, waStatus };
    for (const [name, result] of Object.entries(queryResults)) {
      if (result.error) {
        console.error(`[Dashboard] Supabase query error on "${name}":`, result.error.message, '| Code:', result.error.code);
      }
    }

    const publishedCount = (articles.data ?? []).filter(a => a.status === 'published').length;
    const reviewCount = (articles.data ?? []).filter(a => a.status === 'review').length;

    const keys = apiKeys.data?.value || {};
    const hasKeys = !!(keys.openai || keys.gemini);

    res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    res.json({
      totalCampaigns: campaigns.count ?? 0,
      totalKeywords: keywords.count ?? 0,
      publishedArticles: publishedCount,
      reviewArticles: reviewCount,
      totalArticles: articles.count ?? 0,
      activeSites: sites.count ?? 0,
      activeWorkflows: workflows.data ?? [],
      recentLogs: recentLogs.data ?? [],
      whatsappConnected: waStatus.data?.value?.connected ?? false,
      apiKeysConfigured: hasKeys,
    });
  } catch (err) { next(err); }
};

const projectStatus = async (req, res, next) => {
  try {
    const [campaignsRes, keywordsRes, workflowsRes, articlesRes] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('keywords').select('id, campaign_id, status'),
      supabase.from('workflows').select('id, campaign_id, status, type').not('status', 'in', '("completed","failed","published")'),
      supabase.from('articles').select('keyword_id, status').eq('status', 'published')
    ]);

    if (campaignsRes.error) {
      console.error('[Dashboard] Campaigns fetch error:', campaignsRes.error);
      throw campaignsRes.error;
    }

    const campaigns = campaignsRes.data || [];
    const keywords = keywordsRes.data || [];
    const workflows = workflowsRes.data || [];
    const articles = articlesRes.data || [];

    console.log(`[Dashboard] Status report: ${campaigns.length} projects, ${keywords.length} keywords, ${workflows.length} workflows`);

    const results = campaigns.map(campaign => {
      const campKeywords = keywords.filter(k => k.campaign_id === campaign.id);
      const campWorkflows = workflows.filter(w => w.campaign_id === campaign.id);
      const campArticles = articles.filter(a => campKeywords.some(k => k.id === a.keyword_id));
      const campPublished = campArticles.length;

      const pending = campKeywords.filter(k => k.status === 'pending').length;
      const completed = campKeywords.filter(k => k.status === 'done').length;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        schedule_type: campaign.schedule_type,
        cron_time: campaign.cron_time,
        cron_timezone: campaign.cron_timezone,
        completedKeywords: completed,
        publishedArticles: campPublished,
        activeWorkflows: campWorkflows,
        pendingKeywords: pending,
        isFinished: pending === 0 && campWorkflows.length === 0
      };
    });

    res.json(results);
  } catch (err) { next(err); }
};

module.exports = { stats, projectStatus };
