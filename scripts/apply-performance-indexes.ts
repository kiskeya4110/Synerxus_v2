/**
 * Apply Performance Indexes
 *
 * This script applies performance indexes to the database using the existing
 * Drizzle connection. Run with: npx tsx scripts/apply-performance-indexes.ts
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

const indexes = [
  // Volunteer Activities Indexes
  `CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_id ON volunteer_activities(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_volunteer_activities_user_id ON volunteer_activities(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_volunteer_activities_project_date ON volunteer_activities(project_id, date)`,

  // Project Impacts Indexes
  `CREATE INDEX IF NOT EXISTS idx_project_impacts_project_id ON project_impacts(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_project_impacts_metric_id ON project_impacts(metric_id)`,
  `CREATE INDEX IF NOT EXISTS idx_project_impacts_project_date ON project_impacts(project_id, date)`,

  // Tasks Indexes
  `CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status)`,

  // Project Assignments Indexes
  `CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_project_assignments_volunteer_id ON project_assignments(volunteer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_project_assignments_volunteer_status ON project_assignments(volunteer_id, status)`,

  // Applications Indexes
  `CREATE INDEX IF NOT EXISTS idx_applications_opportunity_id ON applications(opportunity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_volunteer_id ON applications(volunteer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_opportunity_status ON applications(opportunity_id, status)`,

  // Projects Indexes
  `CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_organization_status ON projects(organization_id, status)`,

  // Opportunities Indexes
  `CREATE INDEX IF NOT EXISTS idx_opportunities_organization_id ON opportunities(organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status)`,

  // Users Indexes
  `CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)`,
  `CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id)`,

  // Volunteer Profiles Indexes
  `CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_user_id ON volunteer_profiles(user_id)`,
];

async function applyIndexes() {
  console.log('Applying performance indexes...\n');

  let success = 0;
  let failed = 0;

  for (const indexSql of indexes) {
    try {
      await db.execute(sql.raw(indexSql));
      const indexName = indexSql.match(/idx_\w+/)?.[0] || 'unknown';
      console.log(`✓ Created: ${indexName}`);
      success++;
    } catch (error: any) {
      const indexName = indexSql.match(/idx_\w+/)?.[0] || 'unknown';
      // If index already exists, that's fine
      if (error.message?.includes('already exists')) {
        console.log(`○ Already exists: ${indexName}`);
        success++;
      } else {
        console.error(`✗ Failed: ${indexName} - ${error.message}`);
        failed++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Performance indexes applied!`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

applyIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
