-- Migration 006: Add WordPress Media ID to Articles
-- Stores the WordPress media library ID after the featured image is uploaded during publishing.
-- This allows the system to track the exact WP media item used as the featured image.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS wp_featured_media_id BIGINT;

COMMENT ON COLUMN articles.wp_featured_media_id IS 'WordPress Media Library attachment ID set as featured_media during publish';
