-- =============================================================================
-- Critical Missing Indexes Migration
-- Based on query pattern analysis of Synerxus codebase
-- Run with: psql $DATABASE_URL -f migrations/0004_critical_missing_indexes.sql
-- =============================================================================

-- =============================================================================
-- USERS TABLE - High-frequency lookups (auth flow)
-- =============================================================================

-- Firebase UID lookup (every authenticated request)
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;

-- Organization admin lookup
CREATE INDEX IF NOT EXISTS idx_users_organization_id
ON users(organization_id) WHERE organization_id IS NOT NULL;

-- User type filtering
CREATE INDEX IF NOT EXISTS idx_users_type
ON users(user_type) WHERE user_type IS NOT NULL;

-- =============================================================================
-- NOTIFICATIONS TABLE - Real-time user queries
-- =============================================================================

-- Unread notifications count (badge - very frequent)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, read) WHERE read = false;

-- User notifications with ordering
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Related entity lookup
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity
ON notifications(related_entity_type, related_entity_id)
WHERE related_entity_type IS NOT NULL;

-- =============================================================================
-- MESSAGES TABLE - Conversation queries
-- =============================================================================

-- Thread messages with ordering
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
ON messages(thread_id, created_at ASC);

-- Unread messages for user
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
ON messages(receiver_id, read) WHERE read = false;

-- Conversation lookup (bidirectional messaging)
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver
ON messages(sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender
ON messages(receiver_id, sender_id);

-- =============================================================================
-- CONVERSATION THREADS - Thread lookups
-- =============================================================================

-- Organization threads with ordering
CREATE INDEX IF NOT EXISTS idx_conversation_threads_org_last
ON conversation_threads(organization_id, last_message_at DESC);

-- Volunteer threads with ordering
CREATE INDEX IF NOT EXISTS idx_conversation_threads_volunteer_last
ON conversation_threads(volunteer_id, last_message_at DESC);

-- Thread lookup between org and volunteer (unique conversation)
CREATE INDEX IF NOT EXISTS idx_conversation_threads_org_volunteer
ON conversation_threads(organization_id, volunteer_id);

-- Active threads filter
CREATE INDEX IF NOT EXISTS idx_conversation_threads_status
ON conversation_threads(status) WHERE status = 'active';

-- =============================================================================
-- VOLUNTEER ACTIVITIES - Dashboard aggregations
-- =============================================================================

-- User activities with date ordering
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_date_desc
ON volunteer_activities(user_id, date DESC);

-- Project activities aggregation (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_date_desc
ON volunteer_activities(project_id, date DESC);

-- Task activities lookup
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_task
ON volunteer_activities(task_id) WHERE task_id IS NOT NULL;

-- Verification status filtering
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_verification
ON volunteer_activities(verification_status);

-- =============================================================================
-- PROJECT IMPACTS - Impact aggregations
-- =============================================================================

-- Project impacts by metric (dashboard charts)
CREATE INDEX IF NOT EXISTS idx_project_impacts_project_metric
ON project_impacts(project_id, metric_id);

-- User impacts tracking
CREATE INDEX IF NOT EXISTS idx_project_impacts_user_date
ON project_impacts(user_id, date DESC);

-- Impact verification queue
CREATE INDEX IF NOT EXISTS idx_project_impacts_verification
ON project_impacts(verification_status);

-- =============================================================================
-- APPLICATIONS - Status tracking
-- =============================================================================

-- Volunteer application history
CREATE INDEX IF NOT EXISTS idx_applications_volunteer_status
ON applications(volunteer_id, status);

-- Opportunity applications (org view)
CREATE INDEX IF NOT EXISTS idx_applications_opp_applied
ON applications(opportunity_id, applied_at DESC);

-- Unique volunteer-opportunity (prevent duplicate applications)
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_volunteer_opp
ON applications(volunteer_id, opportunity_id);

-- =============================================================================
-- SAVED/REJECTED OPPORTUNITIES - User preferences
-- =============================================================================

-- Saved opportunity lookup (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_opportunities_unique
ON saved_opportunities(volunteer_id, opportunity_id);

-- Volunteer saved list
CREATE INDEX IF NOT EXISTS idx_saved_opportunities_volunteer
ON saved_opportunities(volunteer_id, saved_at DESC);

-- Rejected opportunity lookup (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rejected_opportunities_unique
ON rejected_opportunities(volunteer_id, opportunity_id);

-- Volunteer rejected list
CREATE INDEX IF NOT EXISTS idx_rejected_opportunities_volunteer
ON rejected_opportunities(volunteer_id, rejected_at DESC);

-- =============================================================================
-- VOLUNTEER PROFILES - Profile lookup & matching
-- =============================================================================

-- User profile lookup (1:1 enforced)
CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteer_profiles_user
ON volunteer_profiles(user_id);

-- Employer link for CSR
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_employer
ON volunteer_profiles(employer_id) WHERE employer_id IS NOT NULL;

-- Onboarding status filter
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_onboarding
ON volunteer_profiles(onboarding_completed);

-- =============================================================================
-- ORGANIZATION PROFILES - Profile lookup
-- =============================================================================

-- Organization profile lookup (1:1 enforced)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_profiles_org
ON organization_profiles(organization_id);

-- Verification status filter
CREATE INDEX IF NOT EXISTS idx_org_profiles_verification
ON organization_profiles(verification_status);

-- =============================================================================
-- CALENDAR EVENTS - Date range queries
-- =============================================================================

-- Event time range queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_time
ON calendar_events(project_id, start_time, end_time);

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_type
ON calendar_events(event_type);

-- =============================================================================
-- OPPORTUNITIES - Discovery & matching
-- =============================================================================

-- Status + date for open opportunities listing
CREATE INDEX IF NOT EXISTS idx_opportunities_status_created
ON opportunities(status, created_at DESC);

-- Urgent opportunities filter
CREATE INDEX IF NOT EXISTS idx_opportunities_urgent
ON opportunities(is_urgent) WHERE is_urgent = true;

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_category
ON opportunities(category) WHERE category IS NOT NULL;

-- =============================================================================
-- AIU TABLES - Impact attribution queries
-- =============================================================================

-- Volunteer AIU by project
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_records_project_volunteer
ON volunteer_aiu_records(project_id, volunteer_id);

-- AIU calculation lookup
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_records_settings
ON volunteer_aiu_records(aiu_settings_id);

-- =============================================================================
-- BENEFICIARY REGISTRY - Deduplication
-- =============================================================================

-- Beneficiary identifier lookup (deduplication)
CREATE INDEX IF NOT EXISTS idx_beneficiary_registry_identifier
ON beneficiary_registry(beneficiary_identifier);

-- Project beneficiary list
CREATE INDEX IF NOT EXISTS idx_beneficiary_registry_project_first
ON beneficiary_registry(project_id, first_served_date);

-- =============================================================================
-- PROJECT AIU SETTINGS - AIU configuration
-- =============================================================================

-- Project AIU settings lookup
CREATE INDEX IF NOT EXISTS idx_project_aiu_settings_project
ON project_aiu_settings(project_id);

-- SDG indicator filtering
CREATE INDEX IF NOT EXISTS idx_project_aiu_settings_sdg
ON project_aiu_settings(sdg_indicator);

-- =============================================================================
-- CSR TABLES - Corporate partner queries
-- =============================================================================

-- Employee commitments by user
CREATE INDEX IF NOT EXISTS idx_employee_commitments_user_status
ON employee_commitments(user_id, status);

-- Employee commitments by partner
CREATE INDEX IF NOT EXISTS idx_employee_commitments_partner_status
ON employee_commitments(partner_id, status);

-- Activity logs by commitment
CREATE INDEX IF NOT EXISTS idx_employee_activity_logs_commitment_time
ON employee_activity_logs(commitment_id, timestamp DESC);

-- Milestones by user
CREATE INDEX IF NOT EXISTS idx_employee_milestones_user
ON employee_milestones(user_id, earned_date DESC);

-- CSR partner by user
CREATE INDEX IF NOT EXISTS idx_csr_partners_user
ON csr_partners(user_id);

-- =============================================================================
-- GIN INDEXES FOR ARRAY FIELDS (Enables @> containment queries)
-- =============================================================================

-- SDG goals containment search
CREATE INDEX IF NOT EXISTS idx_projects_sdg_goals_gin
ON projects USING gin(sdg_goals);

CREATE INDEX IF NOT EXISTS idx_opportunities_sdg_goals_gin
ON opportunities USING gin(sdg_goals);

-- Skills containment search (for matching algorithm)
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_skills_gin
ON volunteer_profiles USING gin(skills);

CREATE INDEX IF NOT EXISTS idx_opportunities_required_skills_gin
ON opportunities USING gin(required_skills);

CREATE INDEX IF NOT EXISTS idx_opportunities_optional_skills_gin
ON opportunities USING gin(optional_skills);

CREATE INDEX IF NOT EXISTS idx_projects_required_skills_gin
ON projects USING gin(required_skills);

-- User skills array
CREATE INDEX IF NOT EXISTS idx_users_skills_gin
ON users USING gin(skills);

-- =============================================================================
-- FOREIGN KEY INDEXES (Drizzle references don't auto-create indexes)
-- =============================================================================

-- Tasks foreign keys
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- Volunteer activities foreign keys
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_id ON volunteer_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_id ON volunteer_activities(project_id);

-- Project impacts foreign keys
CREATE INDEX IF NOT EXISTS idx_project_impacts_project_id ON project_impacts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_impacts_user_id ON project_impacts(user_id);
CREATE INDEX IF NOT EXISTS idx_project_impacts_metric_id ON project_impacts(metric_id);
CREATE INDEX IF NOT EXISTS idx_project_impacts_task_id ON project_impacts(task_id);

-- Project assignments foreign keys
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_volunteer_id ON project_assignments(volunteer_id);

-- Feedback foreign keys
CREATE INDEX IF NOT EXISTS idx_feedback_sender_id ON feedback(sender_id);
CREATE INDEX IF NOT EXISTS idx_feedback_receiver_id ON feedback(receiver_id);
CREATE INDEX IF NOT EXISTS idx_feedback_application_id ON feedback(application_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assignment_id ON feedback(assignment_id);

-- =============================================================================
-- LEADERBOARD & GAMIFICATION
-- =============================================================================

-- Leaderboard ranking
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_total_points
ON leaderboard_stats(total_points DESC);

-- User leaderboard lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_stats_user
ON leaderboard_stats(user_id);

-- User badges by badge type
CREATE INDEX IF NOT EXISTS idx_user_badges_badge
ON user_badges(badge_id);

-- =============================================================================
-- AUDIT & LOGGING
-- =============================================================================

-- User audit logs
CREATE INDEX IF NOT EXISTS idx_user_data_audit_logs_user
ON user_data_audit_logs(user_id, created_at DESC);

-- Unresolved discrepancies
CREATE INDEX IF NOT EXISTS idx_user_data_audit_logs_unresolved
ON user_data_audit_logs(resolved_at, discrepancy_type)
WHERE resolved_at IS NULL AND discrepancy_type IS NOT NULL;

-- =============================================================================
-- VERIFY INDEXES & RUN ANALYZE
-- =============================================================================

-- List all newly created indexes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Update table statistics for query planner
ANALYZE users;
ANALYZE notifications;
ANALYZE messages;
ANALYZE conversation_threads;
ANALYZE volunteer_activities;
ANALYZE project_impacts;
ANALYZE applications;
ANALYZE saved_opportunities;
ANALYZE rejected_opportunities;
ANALYZE volunteer_profiles;
ANALYZE organization_profiles;
ANALYZE calendar_events;
ANALYZE opportunities;
ANALYZE projects;
ANALYZE tasks;
ANALYZE project_assignments;
ANALYZE volunteer_aiu_records;
ANALYZE beneficiary_registry;
ANALYZE employee_commitments;
ANALYZE employee_activity_logs;
ANALYZE leaderboard_stats;
ANALYZE user_badges;
ANALYZE feedback;
