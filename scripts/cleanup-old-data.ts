/**
 * Database Cleanup Script
 * Removes all data from December 20, 2025 and before
 * Preserves data for protected users: alhonorat@gmail.com (ID: 4)
 */

import { pool } from "../server/db";

const CUTOFF_DATE = '2025-12-20';
const PROTECTED_USER_IDS: number[] = []; // No protected users - all old data should be cleaned

async function cleanupOldData() {
  const client = await pool.connect();

  try {
    console.log('Starting database cleanup...');
    console.log(`Cutoff date: ${CUTOFF_DATE}`);
    console.log(`Protected user IDs: ${PROTECTED_USER_IDS.join(', ')}`);

    await client.query('BEGIN');

    // Get list of project IDs to keep (referenced by protected users)
    const protectedProjectsResult = await client.query(`
      SELECT DISTINCT project_id FROM project_assignments
      WHERE volunteer_id IN (${PROTECTED_USER_IDS.join(',')})
      AND project_id IS NOT NULL
      UNION
      SELECT DISTINCT project_id FROM applications
      WHERE volunteer_id IN (${PROTECTED_USER_IDS.join(',')})
      AND project_id IS NOT NULL
      UNION
      SELECT DISTINCT project_id FROM volunteer_activities
      WHERE user_id IN (${PROTECTED_USER_IDS.join(',')})
      AND project_id IS NOT NULL
    `);
    const protectedProjectIds = protectedProjectsResult.rows.map(r => r.project_id).filter(Boolean);
    console.log(`Protected project IDs: ${protectedProjectIds.join(', ') || 'none'}`);

    // Get list of opportunity IDs to keep (referenced by protected users)
    const protectedOppsResult = await client.query(`
      SELECT DISTINCT opportunity_id FROM applications
      WHERE volunteer_id IN (${PROTECTED_USER_IDS.join(',')})
      AND opportunity_id IS NOT NULL
    `);
    const protectedOppIds = protectedOppsResult.rows.map(r => r.opportunity_id).filter(Boolean);
    console.log(`Protected opportunity IDs: ${protectedOppIds.join(', ') || 'none'}`);

    // Build project exclusion clause
    const projectExclusion = protectedProjectIds.length > 0
      ? `AND project_id NOT IN (${protectedProjectIds.join(',')})`
      : '';

    const projectIdExclusion = protectedProjectIds.length > 0
      ? `AND id NOT IN (${protectedProjectIds.join(',')})`
      : '';

    const oppExclusion = protectedOppIds.length > 0
      ? `AND id NOT IN (${protectedOppIds.join(',')})`
      : '';

    // 1. Delete dependent tables first (in order of dependency)

    // Tables with project_id foreign key (delete old records)
    const tables = [
      { name: 'volunteer_activities', dateCol: 'date', userCol: 'user_id' },
      { name: 'project_impacts', dateCol: 'created_at' },
      { name: 'tasks', dateCol: 'created_at' },
      { name: 'calendar_events', dateCol: 'created_at' },
      { name: 'project_assignments', dateCol: 'created_at', userCol: 'volunteer_id' },
      { name: 'beneficiary_registry', dateCol: 'created_at' },
      { name: 'employee_engagement', dateCol: 'created_at' },
      { name: 'employee_commitments', dateCol: 'created_at' },
      { name: 'verified_outputs', dateCol: 'created_at' },
      { name: 'volunteer_aiu_records', dateCol: 'created_at' },
      { name: 'volunteer_stories', dateCol: 'created_at' },
      { name: 'project_aiu_settings', dateCol: 'created_at' },
      { name: 'project_budget_links', dateCol: 'created_at' },
      { name: 'conversation_threads', dateCol: 'created_at' },
      { name: 'messages', dateCol: 'created_at' },
    ];

    for (const table of tables) {
      try {
        let whereClause = `WHERE ${table.dateCol} <= $1 ${projectExclusion}`;
        if (table.userCol) {
          whereClause += ` AND ${table.userCol} NOT IN (${PROTECTED_USER_IDS.join(',')})`;
        }

        const result = await client.query(`
          DELETE FROM ${table.name}
          ${whereClause}
          RETURNING id
        `, [CUTOFF_DATE]);
        console.log(`Deleted ${result.rowCount} from ${table.name}`);
      } catch (err: any) {
        // Table might not exist or have different schema
        if (err.code !== '42P01' && err.code !== '42703') {
          console.log(`Warning: Could not clean ${table.name}: ${err.message}`);
        }
      }
    }

    // 2. Delete applications (uses volunteer_id)
    const applicationsResult = await client.query(`
      DELETE FROM applications
      WHERE created_at <= $1
      AND volunteer_id NOT IN (${PROTECTED_USER_IDS.join(',')})
      RETURNING id
    `, [CUTOFF_DATE]);
    console.log(`Deleted ${applicationsResult.rowCount} applications`);

    // 3. Delete notifications
    const notificationsResult = await client.query(`
      DELETE FROM notifications
      WHERE created_at <= $1
      AND user_id NOT IN (${PROTECTED_USER_IDS.join(',')})
      RETURNING id
    `, [CUTOFF_DATE]);
    console.log(`Deleted ${notificationsResult.rowCount} notifications`);

    // 4. Delete user_badges
    const badgesResult = await client.query(`
      DELETE FROM user_badges
      WHERE earned_at <= $1
      AND user_id NOT IN (${PROTECTED_USER_IDS.join(',')})
      RETURNING id
    `, [CUTOFF_DATE]);
    console.log(`Deleted ${badgesResult.rowCount} user badges`);

    // 5. Delete feedback
    try {
      const feedbackResult = await client.query(`
        DELETE FROM feedback
        WHERE submitted_at <= $1
        AND sender_id NOT IN (${PROTECTED_USER_IDS.join(',')})
        AND receiver_id NOT IN (${PROTECTED_USER_IDS.join(',')})
        RETURNING id
      `, [CUTOFF_DATE]);
      console.log(`Deleted ${feedbackResult.rowCount} feedback entries`);
    } catch (err) {
      console.log('Warning: Could not clean feedback table');
    }

    // 6. Delete opportunities (preserve those referenced by protected user apps)
    const opportunitiesResult = await client.query(`
      DELETE FROM opportunities
      WHERE created_at <= $1
      ${oppExclusion}
      RETURNING id
    `, [CUTOFF_DATE]);
    console.log(`Deleted ${opportunitiesResult.rowCount} opportunities`);

    // 7. Delete projects (preserve those referenced by protected users)
    const projectsResult = await client.query(`
      DELETE FROM projects
      WHERE created_at <= $1
      ${projectIdExclusion}
      RETURNING id
    `, [CUTOFF_DATE]);
    console.log(`Deleted ${projectsResult.rowCount} projects`);

    // Skip user deletion to preserve referential integrity
    console.log('Skipping user deletion to preserve referential integrity');

    await client.query('COMMIT');
    console.log('Database cleanup completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed, rolled back:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupOldData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
