-- =============================================================================
-- Performance Composite Indexes Migration
-- Adds missing composite indexes for high-traffic query patterns
-- Run with: psql $DATABASE_URL -f migrations/0003_performance_composite_indexes.sql
-- =============================================================================

-- =============================================================================
-- VOLUNTEER ACTIVITIES - Critical for dashboard and reporting queries
-- =============================================================================

-- Composite index for activity reports by user and date
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_date
ON volunteer_activities(user_id, activity_date DESC);

-- Composite index for project activity aggregation
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_date
ON volunteer_activities(project_id, activity_date DESC);

-- Index for status filtering in activity queries
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_status
ON volunteer_activities(status);

-- Composite for user activity with status filter
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_status
ON volunteer_activities(user_id, status);

-- =============================================================================
-- PROJECTS - Dashboard and listing queries
-- =============================================================================

-- Composite index for organization dashboard queries
CREATE INDEX IF NOT EXISTS idx_projects_org_status
ON projects(organization_id, status);

-- Composite for active projects by org with date ordering
CREATE INDEX IF NOT EXISTS idx_projects_org_created
ON projects(organization_id, created_at DESC);

-- Index for project visibility filtering
CREATE INDEX IF NOT EXISTS idx_projects_visibility
ON projects(visibility);

-- Composite for public project listings
CREATE INDEX IF NOT EXISTS idx_projects_visibility_status
ON projects(visibility, status);

-- =============================================================================
-- APPLICATIONS - Application management queries
-- =============================================================================

-- Composite for application status by opportunity
CREATE INDEX IF NOT EXISTS idx_applications_opp_status
ON applications(opportunity_id, status);

-- Composite for user application history
CREATE INDEX IF NOT EXISTS idx_applications_user_created
ON applications(user_id, created_at DESC);

-- Index for application status filtering
CREATE INDEX IF NOT EXISTS idx_applications_status
ON applications(status);

-- =============================================================================
-- OPPORTUNITIES - Discovery and matching queries
-- =============================================================================

-- Composite for org opportunity management
CREATE INDEX IF NOT EXISTS idx_opportunities_org_status
ON opportunities(organization_id, status);

-- Composite for active opportunity discovery
CREATE INDEX IF NOT EXISTS idx_opportunities_status_deadline
ON opportunities(status, application_deadline);

-- Index for featured opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_featured
ON opportunities(is_featured);

-- Composite for SDG-based opportunity discovery
CREATE INDEX IF NOT EXISTS idx_opportunities_sdg_status
ON opportunities(sdg_goals, status);

-- =============================================================================
-- PROJECT ASSIGNMENTS - Task management queries
-- =============================================================================

-- Composite for volunteer assignment lookup
CREATE INDEX IF NOT EXISTS idx_project_assignments_volunteer_status
ON project_assignments(volunteer_id, status);

-- Composite for project assignment management
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_status
ON project_assignments(project_id, status);

-- Index for assignment status
CREATE INDEX IF NOT EXISTS idx_project_assignments_status
ON project_assignments(status);

-- =============================================================================
-- TASKS - Task management and filtering
-- =============================================================================

-- Composite for project task listing
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
ON tasks(project_id, status);

-- Composite for task assignment lookup
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
ON tasks(assigned_to, status);

-- Index for task priority filtering
CREATE INDEX IF NOT EXISTS idx_tasks_priority
ON tasks(priority);

-- Composite for project tasks by priority
CREATE INDEX IF NOT EXISTS idx_tasks_project_priority
ON tasks(project_id, priority);

-- =============================================================================
-- AIU RECORDS - Impact calculation queries
-- =============================================================================

-- Composite for user AIU lookups
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_records_user_verified
ON volunteer_aiu_records(user_id, verification_status);

-- Composite for project AIU aggregation
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_records_project_status
ON volunteer_aiu_records(project_id, verification_status);

-- Index for AIU verification queue
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_records_verification
ON volunteer_aiu_records(verification_status);

-- =============================================================================
-- LEADERBOARD STATS - Gamification queries
-- =============================================================================

-- Composite for leaderboard ranking
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_period_score
ON leaderboard_stats(period, total_score DESC);

-- Index for user leaderboard lookup
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_user_id
ON leaderboard_stats(user_id);

-- =============================================================================
-- USER BADGES - Achievement queries
-- =============================================================================

-- Composite for user badge display
CREATE INDEX IF NOT EXISTS idx_user_badges_user_earned
ON user_badges(user_id, earned_at DESC);

-- Index for badge distribution queries
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id
ON user_badges(badge_id);

-- =============================================================================
-- CSR TABLES - Corporate volunteer program queries
-- =============================================================================

-- Composite for employee engagement by partner
CREATE INDEX IF NOT EXISTS idx_employee_engagement_partner_status
ON employee_engagement(partner_id, status);

-- Composite for employee activity logging
CREATE INDEX IF NOT EXISTS idx_employee_activity_logs_engagement_date
ON employee_activity_logs(engagement_id, logged_at DESC);

-- Composite for employee milestones
CREATE INDEX IF NOT EXISTS idx_employee_milestones_engagement_achieved
ON employee_milestones(engagement_id, achieved_at DESC);

-- Index for CSR challenge participation
CREATE INDEX IF NOT EXISTS idx_csr_challenges_status
ON csr_challenges(status);

-- Composite for partner challenges
CREATE INDEX IF NOT EXISTS idx_csr_challenges_partner_status
ON csr_challenges(partner_id, status);

-- =============================================================================
-- BENEFICIARY REGISTRY - Deduplication queries
-- =============================================================================

-- Index for beneficiary hash lookup (deduplication)
CREATE INDEX IF NOT EXISTS idx_beneficiary_registry_hash
ON beneficiary_registry(beneficiary_hash);

-- Composite for project beneficiary counts
CREATE INDEX IF NOT EXISTS idx_beneficiary_registry_project_first
ON beneficiary_registry(project_id, first_interaction);

-- =============================================================================
-- VOLUNTEER PROFILES - Search and filtering
-- =============================================================================

-- Index for volunteer availability search
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_availability
ON volunteer_profiles(availability);

-- Index for volunteer location search (if applicable)
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_location
ON volunteer_profiles(location);

-- Index for onboarding completion filter
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_onboarding
ON volunteer_profiles(onboarding_completed);

-- =============================================================================
-- FEEDBACK - Feedback loop queries
-- =============================================================================

-- Composite for project feedback aggregation
CREATE INDEX IF NOT EXISTS idx_feedback_project_type
ON feedback(project_id, feedback_type);

-- Index for unresolved feedback
CREATE INDEX IF NOT EXISTS idx_feedback_status
ON feedback(status);

-- =============================================================================
-- FULL-TEXT SEARCH INDEXES (Optional - for search functionality)
-- =============================================================================

-- Full-text search on project titles and descriptions
-- CREATE INDEX IF NOT EXISTS idx_projects_search
-- ON projects USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Full-text search on opportunity titles
-- CREATE INDEX IF NOT EXISTS idx_opportunities_search
-- ON opportunities USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- =============================================================================
-- VERIFY ALL NEW INDEXES
-- =============================================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =============================================================================
-- INDEX STATISTICS (run after data is loaded)
-- =============================================================================
-- ANALYZE volunteer_activities;
-- ANALYZE projects;
-- ANALYZE applications;
-- ANALYZE opportunities;
-- ANALYZE project_assignments;
-- ANALYZE tasks;
-- ANALYZE volunteer_aiu_records;
-- ANALYZE leaderboard_stats;
-- ANALYZE employee_engagement;
