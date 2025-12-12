-- Critical Performance Indexes Migration
-- Adds missing indexes for authentication, messaging, and notifications
-- Run with: psql $DATABASE_URL -f migrations/0002_critical_performance_indexes.sql

-- =============================================================================
-- AUTHENTICATION INDEXES (CRITICAL - These are frequently used in auth flows)
-- =============================================================================

-- Index for user lookup by email (used in login, password reset)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Index for user lookup by username (used in login)
CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

-- Index for user lookup by Firebase UID (used in Firebase auth)
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
ON users(firebase_uid);

-- =============================================================================
-- MESSAGING INDEXES (Used in conversation lookups)
-- =============================================================================

-- Index for messages by thread (used in conversation loading)
CREATE INDEX IF NOT EXISTS idx_messages_thread_id
ON messages(thread_id);

-- Index for messages by sender (used in sent messages view)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
ON messages(sender_id);

-- Index for messages by receiver (used in inbox)
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id
ON messages(receiver_id);

-- Composite index for thread + created_at (used in message ordering)
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
ON messages(thread_id, created_at DESC);

-- =============================================================================
-- CONVERSATION THREADS INDEXES
-- =============================================================================

-- Index for threads by organization (used in org inbox)
CREATE INDEX IF NOT EXISTS idx_conversation_threads_org_id
ON conversation_threads(organization_id);

-- Index for threads by volunteer (used in volunteer inbox)
CREATE INDEX IF NOT EXISTS idx_conversation_threads_volunteer_id
ON conversation_threads(volunteer_id);

-- Index for threads by last message (used in sorting)
CREATE INDEX IF NOT EXISTS idx_conversation_threads_last_message
ON conversation_threads(last_message_at DESC);

-- =============================================================================
-- NOTIFICATIONS INDEXES
-- =============================================================================

-- Index for notifications by user (used in notification center)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

-- Composite index for user + read status (used in unread count)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, read);

-- Composite index for user + created_at (used in notification ordering)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- =============================================================================
-- CALENDAR EVENTS INDEXES
-- =============================================================================

-- Index for events by user (used in calendar view)
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id
ON calendar_events(user_id);

-- Index for events by organization (used in org calendar)
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_id
ON calendar_events(organization_id);

-- Index for events by start date (used in date range queries)
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date
ON calendar_events(start_date);

-- =============================================================================
-- IMPACT METRICS INDEXES
-- =============================================================================

-- Index for metrics by category (used in metric selection)
CREATE INDEX IF NOT EXISTS idx_impact_metrics_category
ON impact_metrics(category);

-- Index for metrics by SDG goal (used in SDG filtering)
CREATE INDEX IF NOT EXISTS idx_impact_metrics_sdg_goal
ON impact_metrics(sdg_goal);

-- =============================================================================
-- CSR PARTNER INDEXES
-- =============================================================================

-- Index for CSR partners by user ID (used in partner lookup)
CREATE INDEX IF NOT EXISTS idx_csr_partners_user_id
ON csr_partners(user_id);

-- =============================================================================
-- EMPLOYEE ENGAGEMENT INDEXES
-- =============================================================================

-- Index for employee engagement by partner (used in CSR dashboard)
CREATE INDEX IF NOT EXISTS idx_employee_engagement_partner_id
ON employee_engagement(partner_id);

-- Index for employee engagement by user (used in employee lookup)
CREATE INDEX IF NOT EXISTS idx_employee_engagement_user_id
ON employee_engagement(user_id);

-- =============================================================================
-- SAVED/REJECTED OPPORTUNITIES INDEXES
-- =============================================================================

-- Index for saved opportunities by volunteer
CREATE INDEX IF NOT EXISTS idx_saved_opportunities_volunteer_id
ON saved_opportunities(volunteer_id);

-- Index for rejected opportunities by volunteer
CREATE INDEX IF NOT EXISTS idx_rejected_opportunities_volunteer_id
ON rejected_opportunities(volunteer_id);

-- =============================================================================
-- VOLUNTEER EMPLOYER LINKS INDEXES
-- =============================================================================

-- Index for employer links by volunteer
CREATE INDEX IF NOT EXISTS idx_volunteer_employer_links_volunteer_id
ON volunteer_employer_links(volunteer_id);

-- Index for employer links by partner
CREATE INDEX IF NOT EXISTS idx_volunteer_employer_links_partner_id
ON volunteer_employer_links(partner_id);

-- =============================================================================
-- MATCHES INDEXES
-- =============================================================================

-- Index for matches by volunteer
CREATE INDEX IF NOT EXISTS idx_matches_volunteer_id
ON matches(volunteer_id);

-- Index for matches by organization
CREATE INDEX IF NOT EXISTS idx_matches_organization_id
ON matches(organization_id);

-- =============================================================================
-- ORGANIZATION PROFILES INDEXES
-- =============================================================================

-- Index for org profiles by organization ID
CREATE INDEX IF NOT EXISTS idx_organization_profiles_org_id
ON organization_profiles(organization_id);

-- =============================================================================
-- VERIFY ALL INDEXES
-- =============================================================================

SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
