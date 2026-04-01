-- Migration 009: E-E-A-T Authority Engine — new columns on articles table

-- Store live SERP research data used during generation
ALTER TABLE articles ADD COLUMN IF NOT EXISTS research_data JSONB;

-- Store AI-generated cross-platform fragment posts
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_fragments JSONB;

-- Store the generated JSON-LD schema markup
ALTER TABLE articles ADD COLUMN IF NOT EXISTS schema_json JSONB;

-- Track refresh history (ISO timestamps of content updates)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS refresh_history JSONB DEFAULT '[]'::jsonb;

-- Track Google Indexing API submission status
ALTER TABLE articles ADD COLUMN IF NOT EXISTS indexing_submitted_at TIMESTAMP WITH TIME ZONE;
