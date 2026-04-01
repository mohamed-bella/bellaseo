-- Migration 011: Enterprise Content Features

-- 1. Add advanced AI generation settings to campaigns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS language text DEFAULT 'english',
ADD COLUMN IF NOT EXISTS tone text DEFAULT 'professional';

-- 2. Add internal_links array to articles to track outbound internal links injected
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS internal_links_json jsonb DEFAULT '[]'::jsonb;

-- 3. Create an index to make text searching fast for the internal linking engine
CREATE INDEX IF NOT EXISTS idx_articles_title_search ON public.articles USING gin(to_tsvector('english', title));
