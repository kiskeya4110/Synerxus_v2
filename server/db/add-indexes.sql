-- Add indexes for common query patterns
-- Run with: psql $DATABASE_URL < server/db/add-indexes.sql

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Volunteer activities - heavily queried
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_id ON volunteer_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_id ON volunteer_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_verification_status ON volunteer_activities(verification_status);
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_date ON volunteer_activities(date DESC);
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_project ON volunteer_activities(user_id, project_id);

-- Projects - organization lookups
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_primary_sdg ON projects(primary_sdg);

-- Project assignments
CREATE INDEX IF NOT EXISTS idx_project_assignments_volunteer_id ON project_assignments(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_status ON project_assignments(status);

-- Applications
CREATE INDEX IF NOT EXISTS idx_applications_volunteer_id ON applications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity_id ON applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_organization_id ON opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_project_id ON opportunities(project_id);

-- Project impacts
CREATE INDEX IF NOT EXISTS idx_project_impacts_project_id ON project_impacts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_impacts_user_id ON project_impacts(user_id);
CREATE INDEX IF NOT EXISTS idx_project_impacts_verification_status ON project_impacts(verification_status);
CREATE INDEX IF NOT EXISTS idx_project_impacts_metric_id ON project_impacts(metric_id);

-- Employee engagement (CSR)
CREATE INDEX IF NOT EXISTS idx_employee_engagement_partner_id ON employee_engagement(partner_id);
CREATE INDEX IF NOT EXISTS idx_employee_engagement_employee_email ON employee_engagement(employee_email);

-- CSR Partners
CREATE INDEX IF NOT EXISTS idx_csr_partners_user_id ON csr_partners(user_id);

-- Volunteer profiles
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_user_id ON volunteer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_employer_id ON volunteer_profiles(employer_id);

-- Organization members
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Verified outputs
CREATE INDEX IF NOT EXISTS idx_verified_outputs_partner_id ON verified_outputs(partner_id);
CREATE INDEX IF NOT EXISTS idx_verified_outputs_project_id ON verified_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_verified_outputs_verification_status ON verified_outputs(verification_status);

-- Conversation threads
CREATE INDEX IF NOT EXISTS idx_conversation_threads_volunteer_id ON conversation_threads(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_organization_id ON conversation_threads(organization_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_volunteer_activities_pending_by_project
  ON volunteer_activities(project_id, verification_status)
  WHERE verification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_applications_pending_by_org
  ON applications(opportunity_id, status)
  WHERE status = 'pending';

-- Analyze tables after adding indexes
ANALYZE users;
ANALYZE volunteer_activities;
ANALYZE projects;
ANALYZE project_assignments;
ANALYZE applications;
ANALYZE opportunities;
ANALYZE project_impacts;
ANALYZE employee_engagement;
ANALYZE csr_partners;
ANALYZE volunteer_profiles;
ANALYZE organization_members;
ANALYZE verified_outputs;
ANALYZE conversation_threads;
ANALYZE tasks;
