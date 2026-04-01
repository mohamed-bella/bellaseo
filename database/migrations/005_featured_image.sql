-- Migration 005: Add Featured Image Support to Articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

-- Update existing logs to be more descriptive if needed
COMMENT ON COLUMN articles.featured_image_url IS 'Unsplash or external image URL used as the featured image for the article';
