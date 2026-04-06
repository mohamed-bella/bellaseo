/**
 * Scheduler Service
 * Triggers automated campaign runs based on cron schedules.
 */
const cron = require('node-cron');
const supabase = require('../config/database');
const { CAMPAIGN_STATUS, SCHEDULE_TYPE } = require('../config/constants');
const axios = require('axios');
const { PORT, API_SECRET } = require('../config/env');

const API_BASE = `http://localhost:${PORT}/api`;

async function triggerCampaignWorkflows(scheduleType) {
  console.log(`[scheduler] Triggering ${scheduleType} campaigns...`);
  try {
    const { data: campaigns, error } = await supabase.from('campaigns')
      .select('id')
      .eq('status', CAMPAIGN_STATUS.ACTIVE)
      .eq('schedule_type', scheduleType);

    if (error) throw error;

    for (const campaign of campaigns || []) {
      // Trigger article generation workflow
      try {
         await axios.post(`${API_BASE}/workflows/trigger`, {
            campaign_id: campaign.id,
            type: 'article_generation'
         }, {
            headers: { Authorization: `Bearer ${API_SECRET}` }
         });
         console.log(`[scheduler] Triggered workflow for campaign ${campaign.id}`);
      } catch (err) {
        console.error(`[scheduler] Failed to trigger campaign ${campaign.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[scheduler] Error fetching ${scheduleType} campaigns:`, err);
  }
}

function initScheduler() {
  console.log('[scheduler] Initializing cron jobs...');

  // Hourly: '0 * * * *'
  cron.schedule('0 * * * *', () => {
    triggerCampaignWorkflows(SCHEDULE_TYPE.HOURLY);
  });

  // Daily: '0 0 * * *' (Midnight)
  cron.schedule('0 0 * * *', () => {
    triggerCampaignWorkflows(SCHEDULE_TYPE.DAILY);
  });

  // Weekly: '0 0 * * 0' (Midnight Sunday)
  cron.schedule('0 0 * * 0', () => {
    triggerCampaignWorkflows(SCHEDULE_TYPE.WEEKLY);
  });
  
  // Retry Failed workflows: Every 30 minutes
  cron.schedule('*/30 * * * *', () => {
     console.log(`[scheduler] Triggering retry worker...`);
     require('../workers/retryWorker').run(null).catch(console.error);
  });

  // Living Content Refresh: Every Sunday at 3 AM (Pillar 3)
  cron.schedule('0 3 * * 0', () => {
    console.log('[scheduler] Triggering Living Content refresh cycle...');
    require('../workers/refreshWorker').run(null).catch(console.error);
  });

  // Opportunity Radar: Every 2 hours
  cron.schedule('0 */2 * * *', () => {
    console.log('[scheduler] Triggering Opportunity Radar cycle...');
    require('../workers/radarWorker').runRadarCycle().catch(console.error);
  });

  console.log('[scheduler] Cron jobs active.');
}

module.exports = { initScheduler };
