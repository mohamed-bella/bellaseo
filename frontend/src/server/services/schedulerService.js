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
  console.log(`[scheduler] Checking ${scheduleType} campaigns...`);

  const now = new Date();

  try {
    const { data: campaigns, error } = await supabase.from('campaigns')
      .select('id, cron_time, cron_timezone, posts_per_run, schedule_type')
      .eq('status', CAMPAIGN_STATUS.ACTIVE)
      .eq('schedule_type', scheduleType);

    if (error) throw error;

    for (const campaign of campaigns || []) {
      // 1. Minutely: Always trigger
      if (scheduleType === SCHEDULE_TYPE.MINUTELY) {
        // Carry on to trigger
      } 
      // 2. Hourly: Trigger only at minute 00
      else if (scheduleType === SCHEDULE_TYPE.HOURLY) {
        if (now.getUTCMinutes() !== 0) continue;
      }
      // 3. Daily: Trigger if time matches campaign timezone
      else if (scheduleType === SCHEDULE_TYPE.DAILY) {
        const currentTimeInTZ = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: campaign.cron_timezone || 'UTC'
        }).format(now);

        const targetTime = campaign.cron_time || '09:00';
        if (targetTime !== currentTimeInTZ) {
          continue;
        }
      }
      // 4. Weekly: Trigger if time matches AND it is Sunday (0)
      else if (scheduleType === SCHEDULE_TYPE.WEEKLY) {
        const dayOfWeek = new Intl.DateTimeFormat('en-GB', {
          weekday: 'numeric',
          timeZone: campaign.cron_timezone || 'UTC'
        }).format(now);
        
        // Sunday is 7 or 0 depending on locale, en-GB weekday numeric 1-7 (Mon-Sun)
        // Wait, Intl.DateTimeFormat with numeric weekday for en-GB: 1=Mon, ..., 7=Sun
        if (parseInt(dayOfWeek) !== 7) continue;

        const currentTimeInTZ = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: campaign.cron_timezone || 'UTC'
        }).format(now);

        const targetTime = campaign.cron_time || '09:00';
        if (targetTime !== currentTimeInTZ) {
          continue;
        }
      }

      try {
        await axios.post(`${API_BASE}/workflows/trigger`, {
          campaign_id: campaign.id,
          type: 'article_generation'
        }, {
          headers: { Authorization: `Bearer ${API_SECRET}` }
        });
        console.log(`[scheduler] ✅ Triggered workflow for campaign ${campaign.id} (${scheduleType})`);
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

  // Heartbeat: Check every minute for all schedule types
  cron.schedule('* * * * *', () => {
    triggerCampaignWorkflows(SCHEDULE_TYPE.MINUTELY);
    triggerCampaignWorkflows(SCHEDULE_TYPE.HOURLY);
    triggerCampaignWorkflows(SCHEDULE_TYPE.DAILY);
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
