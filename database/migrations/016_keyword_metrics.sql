-- Migration 016: Add SEO Metrics to Keywords
-- Implements storage for AI Research / Audit results

ALTER TABLE keywords 
ADD COLUMN IF NOT EXISTS volume_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS kd INTEGER DEFAULT 0;

-- Optional: Performance indexes for filtering by difficulty/volume
CREATE INDEX IF NOT EXISTS idx_keywords_metrics ON keywords(volume_score, kd);
