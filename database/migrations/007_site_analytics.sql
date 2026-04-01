-- Add GSC and GA4 fields to sites for per-site analytics configuration
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS gsc_service_account TEXT, -- JSON string
ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;
