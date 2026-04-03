-- Migration: Add Internal Linking CPT Configuration
-- Allows users to choose which Custom Post Types (CPTs) to use for internal linking.

INSERT INTO system_settings (key, value)
VALUES (
    'internal_linking_config',
    '{"enabled_cpts": ["post", "page"]}'
)
ON CONFLICT (key) DO NOTHING;
