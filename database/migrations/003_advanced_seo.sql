-- ==========================================
-- Migration 003: Advanced SEO & Content
-- ==========================================

-- 1. Extend Campaigns with Power Controls
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS prompt_template TEXT,
ADD COLUMN IF NOT EXISTS target_word_count INTEGER DEFAULT 1500,
ADD COLUMN IF NOT EXISTS article_style TEXT DEFAULT 'informative',
ADD COLUMN IF NOT EXISTS target_cpt TEXT DEFAULT 'post',
ADD COLUMN IF NOT EXISTS target_site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- 2. Create Clusters Table (Topic Silos)
CREATE TABLE IF NOT EXISTS clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update Keywords for Silo Support
ALTER TABLE keywords
ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_pillar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linking_data JSONB DEFAULT '{}'::jsonb; -- For future link mappings

-- 4. Triggers for clusters
DROP TRIGGER IF EXISTS update_clusters_updated_at ON clusters;
CREATE TRIGGER update_clusters_updated_at 
    BEFORE UPDATE ON clusters 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();
