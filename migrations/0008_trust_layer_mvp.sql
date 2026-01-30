-- Phase 1: Outcome-first logging + Enhanced Audit Trail
-- Make hours nullable (outcome-first approach)
ALTER TABLE volunteer_activities ALTER COLUMN hours DROP NOT NULL;

-- Add outcome-first fields
ALTER TABLE volunteer_activities ADD COLUMN IF NOT EXISTS outcome_text TEXT;
ALTER TABLE volunteer_activities ADD COLUMN IF NOT EXISTS geolocation JSONB;
ALTER TABLE volunteer_activities ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE volunteer_activities ADD COLUMN IF NOT EXISTS sdg_tags INTEGER[];

-- Phase 2: NGO edit-on-verify fields
ALTER TABLE volunteer_activities ADD COLUMN IF NOT EXISTS edited_outcome_text TEXT;
ALTER TABLE volunteer_activities ADD COLUMN IF NOT EXISTS edited_outcome_quantity INTEGER;
ALTER TABLE volunteer_activities ADD COLUMN IF NOT EXISTS edited_sdg_tags INTEGER[];

-- Phase 3: Volunteer diaspora profile
ALTER TABLE volunteer_profiles ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
