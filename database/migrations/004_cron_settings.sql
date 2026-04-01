-- ==========================================
-- Migration 004: Cron Settings & Visuals
-- ==========================================

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS cron_time TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS cron_timezone TEXT DEFAULT 'Africa/Casablanca',
ADD COLUMN IF NOT EXISTS posts_per_run INTEGER DEFAULT 1;

-- Ensure CAMPAIGN_STATUS type has 'paused' if not already
