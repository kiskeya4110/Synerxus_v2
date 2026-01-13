-- Migration: Add External Volunteers and Admin Logging Support
-- This migration enables organization admins to log volunteer hours on behalf of volunteers,
-- including external/unregistered volunteers who are not on the platform.

-- ============================================
-- EXTERNAL VOLUNTEERS TABLE
-- ============================================

-- Create external_volunteers table for volunteers not registered on the platform
CREATE TABLE IF NOT EXISTS external_volunteers (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for organization-based queries
CREATE INDEX IF NOT EXISTS idx_external_volunteers_org
ON external_volunteers(organization_id, is_active);

-- Index for searching by name
CREATE INDEX IF NOT EXISTS idx_external_volunteers_name
ON external_volunteers(organization_id, full_name);

-- ============================================
-- VOLUNTEER ACTIVITIES - ADD ADMIN LOGGING FIELDS
-- ============================================

-- Add external_volunteer_id for linking to non-registered volunteers
ALTER TABLE volunteer_activities
ADD COLUMN IF NOT EXISTS external_volunteer_id INTEGER REFERENCES external_volunteers(id);

-- Add logged_by to track who logged the activity (admin user id)
ALTER TABLE volunteer_activities
ADD COLUMN IF NOT EXISTS logged_by INTEGER REFERENCES users(id);

-- Add logged_by_type to distinguish self-logged vs admin-logged activities
ALTER TABLE volunteer_activities
ADD COLUMN IF NOT EXISTS logged_by_type TEXT DEFAULT 'self';

-- Index for external volunteer activities
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_external
ON volunteer_activities(external_volunteer_id) WHERE external_volunteer_id IS NOT NULL;

-- Index for admin-logged activities
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_logged_by
ON volunteer_activities(logged_by) WHERE logged_by IS NOT NULL;

-- ============================================
-- PROJECT IMPACTS - ADD ADMIN LOGGING FIELDS
-- ============================================

-- Add external_volunteer_id for linking to non-registered volunteers
ALTER TABLE project_impacts
ADD COLUMN IF NOT EXISTS external_volunteer_id INTEGER REFERENCES external_volunteers(id);

-- Add logged_by to track who logged the impact (admin user id)
ALTER TABLE project_impacts
ADD COLUMN IF NOT EXISTS logged_by INTEGER REFERENCES users(id);

-- Add logged_by_type to distinguish self-logged vs admin-logged impacts
ALTER TABLE project_impacts
ADD COLUMN IF NOT EXISTS logged_by_type TEXT DEFAULT 'self';

-- Index for external volunteer impacts
CREATE INDEX IF NOT EXISTS idx_project_impacts_external
ON project_impacts(external_volunteer_id) WHERE external_volunteer_id IS NOT NULL;

-- Index for admin-logged impacts
CREATE INDEX IF NOT EXISTS idx_project_impacts_logged_by
ON project_impacts(logged_by) WHERE logged_by IS NOT NULL;
