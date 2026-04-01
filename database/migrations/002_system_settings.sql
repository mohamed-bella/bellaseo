-- Table for system-wide settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO system_settings (key, value)
VALUES 
    ('ai_config', '{"provider": "openai", "openai_model": "gpt-4o", "gemini_model": "gemini-1.5-pro"}'),
    ('api_keys', '{"openai": "", "gemini": ""}')
ON CONFLICT (key) DO NOTHING;
