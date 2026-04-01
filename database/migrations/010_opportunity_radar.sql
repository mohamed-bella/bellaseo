-- Migration 010: Opportunity Radar system
-- Creates tables for the 24/7 web listener to track what to search and the leads it finds

CREATE TABLE IF NOT EXISTS radar_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    keywords TEXT NOT NULL, -- e.g. "Looking for morocco tours"
    platforms JSONB NOT NULL DEFAULT '["reddit.com", "quora.com", "x.com", "twitter.com"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES radar_rules(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    snippet TEXT,
    source_url TEXT NOT NULL UNIQUE,
    intent_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new', -- new, notified, ignored
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_radar_rules_active ON radar_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_rule ON opportunities(rule_id);
