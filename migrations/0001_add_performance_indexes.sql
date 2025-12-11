-- Performance Indexes Migration
-- Improves query performance for dashboard and frequently accessed data
-- Run with: psql $DATABASE_URL -f migrations/0001_add_performance_indexes.sql

-- =============================================================================
-- VOLUNTEER ACTIVITIES INDEXES
-- These columns are frequently used in dashboard queries for filtering
-- =============================================================================

-- Index for filtering activities by project (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_id
ON volunteer_activities(project_id);

-- Index for filtering activities by user (used in volunteer dashboard)
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_id
ON volunteer_activities(user_id);

-- Composite index for project + date (used in monthly aggregations)
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_date
ON volunteer_activities(project_id, date);

-- =============================================================================
-- PROJECT IMPACTS INDEXES
-- Used for impact calculations and SDG reporting
-- =============================================================================

-- Index for filtering impacts by project (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_project_impacts_project_id
ON project_impacts(project_id);

-- Index for filtering impacts by metric (used in aggregations)
CREATE INDEX IF NOT EXISTS idx_project_impacts_metric_id
ON project_impacts(metric_id);

-- Composite index for project + date (used in time-series queries)
CREATE INDEX IF NOT EXISTS idx_project_impacts_project_date
ON project_impacts(project_id, date);

-- =============================================================================
-- TASKS INDEXES
-- Used for project task lookups and assignment tracking
-- =============================================================================

-- Index for filtering tasks by project (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_tasks_project_id
ON tasks(project_id);

-- Index for filtering tasks by assignee (used in volunteer dashboard)
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id
ON tasks(assignee_id);

-- Composite index for project + status (used in completion tracking)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
ON tasks(project_id, status);

-- =============================================================================
-- PROJECT ASSIGNMENTS INDEXES
-- Used for volunteer-project relationship lookups
-- =============================================================================

-- Index for filtering assignments by project (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id
ON project_assignments(project_id);

-- Index for filtering assignments by volunteer (used in volunteer dashboard)
CREATE INDEX IF NOT EXISTS idx_project_assignments_volunteer_id
ON project_assignments(volunteer_id);

-- Composite index for volunteer + status (used in active assignment lookups)
CREATE INDEX IF NOT EXISTS idx_project_assignments_volunteer_status
ON project_assignments(volunteer_id, status);

-- =============================================================================
-- APPLICATIONS INDEXES
-- Used for opportunity application tracking
-- =============================================================================

-- Index for filtering applications by opportunity (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_applications_opportunity_id
ON applications(opportunity_id);

-- Index for filtering applications by volunteer (used in volunteer dashboard)
CREATE INDEX IF NOT EXISTS idx_applications_volunteer_id
ON applications(volunteer_id);

-- Composite index for opportunity + status (used in application status tracking)
CREATE INDEX IF NOT EXISTS idx_applications_opportunity_status
ON applications(opportunity_id, status);

-- =============================================================================
-- PROJECTS INDEXES
-- Used for organization-level queries
-- =============================================================================

-- Index for filtering projects by organization (used in org dashboard)
CREATE INDEX IF NOT EXISTS idx_projects_organization_id
ON projects(organization_id);

-- Composite index for organization + status (used in active project lookups)
CREATE INDEX IF NOT EXISTS idx_projects_organization_status
ON projects(organization_id, status);

-- =============================================================================
-- OPPORTUNITIES INDEXES
-- Used for opportunity discovery and matching
-- =============================================================================

-- Index for filtering opportunities by organization
CREATE INDEX IF NOT EXISTS idx_opportunities_organization_id
ON opportunities(organization_id);

-- Index for filtering opportunities by status (active/closed)
CREATE INDEX IF NOT EXISTS idx_opportunities_status
ON opportunities(status);

-- =============================================================================
-- USERS INDEXES
-- Used for authentication and profile lookups
-- =============================================================================

-- Index for filtering users by type (volunteer/organization/corporate-partner)
CREATE INDEX IF NOT EXISTS idx_users_user_type
ON users(user_type);

-- Index for filtering users by organization (org members)
CREATE INDEX IF NOT EXISTS idx_users_organization_id
ON users(organization_id);

-- =============================================================================
-- VOLUNTEER PROFILES INDEXES
-- Used for volunteer matching and profile lookups
-- =============================================================================

-- Index for looking up volunteer profile by user ID
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_user_id
ON volunteer_profiles(user_id);

-- =============================================================================
-- VERIFY INDEXES CREATED
-- =============================================================================

-- List all indexes created (for verification)
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
