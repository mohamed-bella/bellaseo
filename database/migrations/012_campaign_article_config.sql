-- Migration 012: Per-Campaign Article Configuration
-- Adds a JSONB column to store Article Studio settings per campaign

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS article_config jsonb DEFAULT NULL;

-- Index for fast JSON queries
CREATE INDEX IF NOT EXISTS idx_campaigns_article_config ON public.campaigns USING gin(article_config);

COMMENT ON COLUMN public.campaigns.article_config IS 
  'Per-campaign Article Studio configuration (overrides global article_config setting). JSON object with keys: content, voice, seo, schema, author, linking, media, faq, output, ai_directives';
