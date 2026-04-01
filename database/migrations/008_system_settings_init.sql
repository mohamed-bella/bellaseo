-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default branding settings
INSERT INTO system_settings (key, value)
VALUES (
    'branding',
    '{
        "name": "SEO Engine",
        "tagline": "24/7 AI-driven content factory",
        "companyName": "SignGaze OS Studio",
        "primaryColor": "#FF6B00",
        "iconName": "TrendingUp"
    }'
)
ON CONFLICT (key) DO NOTHING;
