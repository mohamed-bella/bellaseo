const supabase = require('../config/database');
const { CAMPAIGN_STATUS, WORKFLOW_STATUS, ARTICLE_STATUS } = require('../config/constants');

async function getProjectStatus() {
  console.log("# PROJECT STATUS REPORT\n");

  const { data: campaigns, error: cErr } = await supabase.from('campaigns').select('*');
  if (cErr) {
      console.error("Error fetching campaigns:", cErr);
      return;
  }

  if (!campaigns || campaigns.length === 0) {
      console.log("No projects found.");
      return;
  }

  for (const campaign of campaigns) {
    console.log(`## Project: ${campaign.name}`);
    console.log(`- **Status:** ${campaign.status}`);
    console.log(`- **Schedule:** ${campaign.schedule_type} (${campaign.cron_time || 'N/A'} ${campaign.cron_timezone || 'N/A'})`);

    // Fetch Keywords for this campaign
    const { data: keywords, error: kErr } = await supabase.from('keywords')
      .select('id, status')
      .eq('campaign_id', campaign.id);
    
    if (kErr) {
        console.error(`Error fetching keywords for ${campaign.name}:`, kErr);
        continue;
    }

    const keywordIds = keywords.map(k => k.id);
    const pendingKeywords = keywords.filter(k => k.status === 'pending').length;
    const completedKeywords = keywords.filter(k => k.status === 'done').length;

    // Past: Articles Published
    let publishedCount = 0;
    if (keywordIds.length > 0) {
        const { count, error: aErr } = await supabase.from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published')
          .in('keyword_id', keywordIds);
        if (!aErr) publishedCount = count;
    }

    // Now: Workflows in progress
    const { data: activeWorkflows } = await supabase.from('workflows')
      .select('*')
      .eq('campaign_id', campaign.id)
      .not('status', 'in', '("completed","failed","published")');

    console.log(`- **What's happened:** ${completedKeywords} keywords completed. ${publishedCount} articles published.`);
    
    if (activeWorkflows && activeWorkflows.length > 0) {
      console.log(`- **Now:** ${activeWorkflows.length} workflow(s) active (${activeWorkflows.map(w => w.type + ':' + w.status).join(', ')}).`);
    } else {
      console.log(`- **Now:** Idle.`);
    }

    console.log(`- **Future:** ${pendingKeywords} keywords waiting in queue.`);
    
    const isOkay = (pendingKeywords === 0 && (!activeWorkflows || activeWorkflows.length === 0));
    console.log(`- **When okay:** ${isOkay ? '✅ Finished' : '⏳ In progress...'}`);
    console.log("");
  }
}

getProjectStatus().catch(console.error);
