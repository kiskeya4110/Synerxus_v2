-- Additional Performance Indexes Migration
-- Improves query performance for authentication lookups and time-based queries
-- Run with: psql $DATABASE_URL -f migrations/0002_add_auth_and_timestamp_indexes.sql

-- =============================================================================
-- AUTHENTICATION & USER LOOKUP INDEXES
-- Critical for login performance and user resolution
-- =============================================================================

-- Index for email lookups (used in authentication and user search)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Index for Firebase UID lookups (used in Firebase authentication flow)
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
ON users(firebase_uid);

-- Index for username lookups (used in authentication)
CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

-- =============================================================================
-- TIMESTAMP INDEXES FOR TIME-RANGE QUERIES
-- Improves dashboard queries that filter by date ranges
-- =============================================================================

-- Index for user creation date (used in analytics and user growth reports)
CREATE INDEX IF NOT EXISTS idx_users_created_at
ON users(created_at);

-- Index for activity date (used in time-range filtering on dashboard)
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_date
ON volunteer_activities(date);

-- Index for impact date (used in time-range filtering on dashboard)
CREATE INDEX IF NOT EXISTS idx_project_impacts_date
ON project_impacts(date);

-- Composite index for user + date on activities (used in volunteer dashboard)
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_date
ON volunteer_activities(user_id, date);

-- Index for project creation date (used in analytics)
CREATE INDEX IF NOT EXISTS idx_projects_created_at
ON projects(created_at);

-- Index for application date (used in application tracking)
CREATE INDEX IF NOT EXISTS idx_applications_applied_at
ON applications(applied_at);

-- =============================================================================
-- ORGANIZATION PROFILE INDEXES
-- Used for organization lookup and matching
-- =============================================================================

-- Index for organization profile by org ID (used in dashboard)
CREATE INDEX IF NOT EXISTS idx_organization_profiles_organization_id
ON organization_profiles(organization_id);

-- =============================================================================
-- NOTIFICATION INDEXES
-- Used for notification delivery and status tracking
-- =============================================================================

-- Index for notifications by user (used in notification delivery)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

-- Composite index for user + read status (used in unread count queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, read);

-- =============================================================================
-- CONVERSATION & MESSAGING INDEXES
-- Used for message retrieval and conversation tracking
-- =============================================================================

-- Index for conversation threads by participants
CREATE INDEX IF NOT EXISTS idx_conversation_threads_volunteer_id
ON conversation_threads(volunteer_id);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_organization_id
ON conversation_threads(organization_id);

-- Index for messages by thread
CREATE INDEX IF NOT EXISTS idx_org_messages_thread_id
ON org_messages(thread_id);

-- Index for messages by created date (for pagination)
CREATE INDEX IF NOT EXISTS idx_org_messages_created_at
ON org_messages(created_at);

-- =============================================================================
-- VERIFICATION STATUS INDEXES
-- Used for filtering verified/pending activities and impacts
-- =============================================================================

-- Index for activity verification status (used in dashboard calculations)
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_verification_status
ON volunteer_activities(verification_status);

-- Index for impact verification status (used in impact calculations)
CREATE INDEX IF NOT EXISTS idx_project_impacts_verification_status
ON project_impacts(verification_status);

-- =============================================================================
-- VERIFY INDEXES CREATED
-- =============================================================================

SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
