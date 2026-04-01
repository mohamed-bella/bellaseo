-- ============================================================
--  Migration: Author Profiles & Prompt Templates on Sites
--  Filename: 013_site_author_profiles.sql
-- ============================================================

-- 1. Add author_profile JSONB column to sites
--    Stores: name, bio, audience, avatar_url, social links
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS author_profile jsonb DEFAULT NULL;

COMMENT ON COLUMN public.sites.author_profile IS
  'Per-site author persona used by the AI prompt engine.
   Recommended keys: name (string), bio (string), audience (string),
   avatar_url (string), twitter (string), linkedin (string).
   Example:
   {
     "name": "Sarah Mitchell",
     "bio": "Senior SEO specialist with 10 years in e-commerce growth.",
     "audience": "e-commerce store owners and digital marketers",
     "avatar_url": "https://example.com/sarah.jpg"
   }';

-- 2. Add master_prompt_template TEXT column to sites
--    Allows per-site full Markdown prompt templates (overrides global)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS master_prompt_template text DEFAULT NULL;

COMMENT ON COLUMN public.sites.master_prompt_template IS
  'Optional full Markdown prompt template for this site.
   Supports {{variable}} interpolation. When set, overrides the
   campaign-level and global master_prompt_template.
   Available variables: {{keyword}}, {{secondaryKeywords}},
   {{authorName}}, {{authorBio}}, {{targetAudience}}, {{siteName}},
   {{tone}}, {{language}}, {{targetLength}}, {{niche}}, {{intent}},
   {{internalLinks}}, {{externalLinks}}, {{researchBlock}},
   {{faqDirective}}, {{conclusionDirective}}, {{campaignDirectives}}.';

-- 3. Index for fast lookup by site type
CREATE INDEX IF NOT EXISTS idx_sites_type ON public.sites (type);
