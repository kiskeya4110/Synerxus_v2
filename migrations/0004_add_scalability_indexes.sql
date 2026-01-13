-- Migration: Add Scalability Indexes for 2000+ Users
-- This migration adds missing indexes identified during scalability analysis
-- These indexes optimize high-traffic queries and prevent full table scans

-- ============================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================

-- Index for fetching user notifications ordered by date (used in getNotifications)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC);

-- Index for counting unread notifications efficiently
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, read) WHERE read = false;

-- ============================================
-- MESSAGES TABLE INDEXES
-- ============================================

-- Index for fetching messages by receiver (inbox queries)
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created
ON messages(receiver_id, created_at DESC);

-- Index for fetching messages by sender (sent messages)
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON messages(sender_id, created_at DESC);

-- Index for unread message counts
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
ON messages(receiver_id, read) WHERE read = false;

-- Index for thread-based message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
ON messages(thread_id, created_at ASC);

-- ============================================
-- EMPLOYEE ACTIVITY LOGS TABLE INDEXES
-- ============================================

-- Index for time-range queries on employee activities (CSR reporting)
CREATE INDEX IF NOT EXISTS idx_employee_activity_logs_timestamp
ON employee_activity_logs(timestamp DESC);

-- Composite index for partner reporting by date
CREATE INDEX IF NOT EXISTS idx_employee_activity_logs_partner_timestamp
ON employee_activity_logs(partner_id, timestamp DESC);

-- Composite index for user activity history
CREATE INDEX IF NOT EXISTS idx_employee_activity_logs_user_timestamp
ON employee_activity_logs(user_id, timestamp DESC);

-- ============================================
-- USER DATA AUDIT LOGS TABLE INDEXES
-- ============================================

-- Index for fetching recent audit entries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
ON user_data_audit_logs(created_at DESC);

-- Index for fetching audits by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
ON user_data_audit_logs(user_id, created_at DESC);

-- Index for fetching audits by table name
CREATE INDEX IF NOT EXISTS idx_audit_logs_table
ON user_data_audit_logs(table_name, created_at DESC);

-- ============================================
-- VOLUNTEER ACTIVITIES TABLE INDEXES
-- ============================================

-- Composite index for project activities with date ordering
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_date
ON volunteer_activities(project_id, date DESC);

-- Composite index for user activities with verification status
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_status
ON volunteer_activities(user_id, verification_status, date DESC);

-- ============================================
-- VOLUNTEER AIU RECORDS TABLE INDEXES
-- ============================================

-- Index for time-based AIU queries
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_created
ON volunteer_aiu_records(created_at DESC);

-- Index for reporting period queries
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_period
ON volunteer_aiu_records(reporting_period, created_at DESC);

-- Composite index for project AIU reporting
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_project_created
ON volunteer_aiu_records(project_id, created_at DESC);

-- Composite index for volunteer AIU history
CREATE INDEX IF NOT EXISTS idx_volunteer_aiu_volunteer_created
ON volunteer_aiu_records(volunteer_id, created_at DESC);

-- ============================================
-- APPLICATIONS TABLE INDEXES
-- ============================================

-- Index for volunteer application history
CREATE INDEX IF NOT EXISTS idx_applications_volunteer_created
ON applications(volunteer_id, created_at DESC);

-- Index for opportunity applications
CREATE INDEX IF NOT EXISTS idx_applications_opportunity_created
ON applications(opportunity_id, created_at DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_applications_status
ON applications(status, created_at DESC);

-- ============================================
-- PROJECT IMPACTS TABLE INDEXES
-- ============================================

-- Index for project impact queries
CREATE INDEX IF NOT EXISTS idx_project_impacts_project
ON project_impacts(project_id);

-- Index for metric-based queries
CREATE INDEX IF NOT EXISTS idx_project_impacts_metric
ON project_impacts(metric_id);
