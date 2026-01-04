/**
 * Script to remove test/dummy data created before December 1, 2025
 * Run with: npx tsx scripts/cleanup-test-data.ts
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const CUTOFF_DATE = '2025-12-22'; // Delete data created before Dec 22 (i.e., Dec 21 and earlier)

async function cleanupTestData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log(`\n🧹 Cleaning up test data created before ${CUTOFF_DATE}...\n`);

  try {
    // First, get IDs of entities to delete
    const oldUsers = await pool.query(
      `SELECT id FROM users WHERE created_at < $1`,
      [CUTOFF_DATE]
    );
    const oldUserIds = oldUsers.rows.map(r => r.id);

    const oldOrgs = await pool.query(
      `SELECT id FROM organizations WHERE created_at < $1`,
      [CUTOFF_DATE]
    );
    const oldOrgIds = oldOrgs.rows.map(r => r.id);

    const oldCsrPartners = await pool.query(
      `SELECT id FROM csr_partners WHERE created_at < $1`,
      [CUTOFF_DATE]
    );
    const oldCsrIds = oldCsrPartners.rows.map(r => r.id);

    console.log(`Found ${oldUserIds.length} users, ${oldOrgIds.length} organizations, ${oldCsrIds.length} CSR partners to delete\n`);

    if (oldUserIds.length === 0 && oldOrgIds.length === 0 && oldCsrIds.length === 0) {
      console.log('No test data found to delete.');
      return;
    }

    // Delete in correct order (child tables first)
    const deletions = [
      // CSR-related tables (delete these first as they reference other tables)
      { table: 'aiu_export_logs', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'volunteer_aiu_records', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'employee_activity_logs', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'employee_milestones', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'employee_commitments', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'csr_commitment_goals', condition: oldCsrIds.length > 0 ? `csr_partner_id IN (${oldCsrIds.join(',')})` : '1=0' },
      { table: 'project_budget_links', condition: oldCsrIds.length > 0 ? `csr_partner_id IN (${oldCsrIds.join(',')})` : '1=0' },
      { table: 'csr_challenges', condition: oldCsrIds.length > 0 ? `csr_partner_id IN (${oldCsrIds.join(',')})` : '1=0' },
      { table: 'volunteer_employer_links', condition: oldCsrIds.length > 0 ? `csr_partner_id IN (${oldCsrIds.join(',')})` : '1=0' },
      { table: 'employee_engagement', condition: oldCsrIds.length > 0 ? `csr_partner_id IN (${oldCsrIds.join(',')})` : '1=0' },

      // Claude AI tables
      { table: 'claude_bookmarks', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'claude_messages', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'claude_conversations', condition: `created_at < '${CUTOFF_DATE}'` },

      // Story tables
      { table: 'story_likes', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'volunteer_stories', condition: `created_at < '${CUTOFF_DATE}'` },

      // Invitation tables
      { table: 'invitation_code_usage', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'invitation_codes', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'invitation_templates', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'team_invitations', condition: `created_at < '${CUTOFF_DATE}'` },

      // Matching and analytics
      { table: 'matches', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'match_analytics', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'matchable_organizations', condition: oldOrgIds.length > 0 ? `organization_id IN (${oldOrgIds.join(',')})` : '1=0' },
      { table: 'volunteers', condition: oldUserIds.length > 0 ? `user_id IN (${oldUserIds.join(',')})` : '1=0' },

      // User activity and badges
      { table: 'user_badges', condition: oldUserIds.length > 0 ? `user_id IN (${oldUserIds.join(',')})` : '1=0' },
      { table: 'leaderboard_stats', condition: oldUserIds.length > 0 ? `user_id IN (${oldUserIds.join(',')})` : '1=0' },
      { table: 'volunteer_spotlights', condition: oldUserIds.length > 0 ? `volunteer_id IN (${oldUserIds.join(',')})` : '1=0' },
      { table: 'notifications', condition: oldUserIds.length > 0 ? `user_id IN (${oldUserIds.join(',')})` : '1=0' },
      { table: 'user_data_audit_logs', condition: oldUserIds.length > 0 ? `user_id IN (${oldUserIds.join(',')})` : '1=0' },

      // Messages and conversations
      { table: 'messages', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'conversation_threads', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'conversations', condition: `created_at < '${CUTOFF_DATE}'` },

      // Feedback
      { table: 'feedback', condition: `created_at < '${CUTOFF_DATE}'` },

      // Opportunities and applications
      { table: 'saved_opportunities', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'rejected_opportunities', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'applications', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'opportunities', condition: oldOrgIds.length > 0 ? `organization_id IN (${oldOrgIds.join(',')})` : '1=0' },

      // Volunteer-organization relationships
      { table: 'volunteer_organization_relationships', condition: `created_at < '${CUTOFF_DATE}'` },

      // Project-related tables
      { table: 'beneficiary_registry', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'project_aiu_settings', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'csr_project_portfolios', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'verified_outputs', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'project_impacts', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'volunteer_activities', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'calendar_events', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'tasks', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'project_assignments', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'projects', condition: oldOrgIds.length > 0 ? `organization_id IN (${oldOrgIds.join(',')})` : '1=0' },

      // Impact metrics (keep the definitions, just delete old data)
      // { table: 'impact_metrics', condition: `created_at < '${CUTOFF_DATE}'` },

      // Uploaded images for old users/orgs
      { table: 'uploaded_images', condition: `created_at < '${CUTOFF_DATE}'` },

      // Organization related
      { table: 'organization_profiles', condition: oldOrgIds.length > 0 ? `organization_id IN (${oldOrgIds.join(',')})` : '1=0' },
      { table: 'organization_members', condition: oldOrgIds.length > 0 ? `organization_id IN (${oldOrgIds.join(',')})` : '1=0' },

      // Volunteer profiles
      { table: 'volunteer_profiles', condition: oldUserIds.length > 0 ? `user_id IN (${oldUserIds.join(',')})` : '1=0' },

      // Now delete the main entities
      { table: 'csr_partners', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'organizations', condition: `created_at < '${CUTOFF_DATE}'` },
      { table: 'users', condition: `created_at < '${CUTOFF_DATE}'` },
    ];

    for (const { table, condition } of deletions) {
      try {
        const result = await pool.query(`DELETE FROM ${table} WHERE ${condition}`);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`✓ Deleted ${result.rowCount} rows from ${table}`);
        }
      } catch (error: any) {
        // Skip if table doesn't exist or has FK issues
        if (error.code === '42P01') {
          // Table doesn't exist, skip
        } else if (error.code === '23503') {
          console.log(`⚠ Skipped ${table} - foreign key constraint (will be handled by dependent deletion)`);
        } else {
          console.error(`✗ Error deleting from ${table}:`, error.message);
        }
      }
    }

    // Also clean up badges table if there are orphaned badges
    await pool.query(`DELETE FROM badges WHERE created_at < $1`, [CUTOFF_DATE]);

    console.log('\n✅ Test data cleanup complete!\n');

    // Show summary
    const remainingUsers = await pool.query(`SELECT COUNT(*) FROM users`);
    const remainingOrgs = await pool.query(`SELECT COUNT(*) FROM organizations`);
    const remainingCsr = await pool.query(`SELECT COUNT(*) FROM csr_partners`);

    console.log('Remaining data:');
    console.log(`  Users: ${remainingUsers.rows[0].count}`);
    console.log(`  Organizations: ${remainingOrgs.rows[0].count}`);
    console.log(`  CSR Partners: ${remainingCsr.rows[0].count}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanupTestData().catch(console.error);
