-- Migration 018: Track Blogger post IDs for published articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS blogger_post_id TEXT;
CREATE INDEX IF NOT EXISTS idx_articles_blogger_post_id ON articles(blogger_post_id) WHERE blogger_post_id IS NOT NULL;
