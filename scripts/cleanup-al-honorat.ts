/**
 * Targeted cleanup: Delete Al Honorat's (user ID 4) old project assignments,
 * applications, and volunteer activities that reference old/dummy organizations.
 *
 * This removes all legacy data that predates the DATA_CUTOFF (Dec 15, 2025).
 */

import { pool } from "../server/db";

const USER_ID = 4; // alhonorat@gmail.com
const CUTOFF_DATE = '2025-12-20';

async function cleanupAlHonorat() {
  const client = await pool.connect();

  try {
    console.log(`Starting targeted cleanup for user ${USER_ID}...`);
    console.log(`Cutoff date: ${CUTOFF_DATE}`);

    await client.query('BEGIN');

    // 1. Delete old project assignments
    const assignmentsResult = await client.query(`
      DELETE FROM project_assignments
      WHERE volunteer_id = $1
      AND created_at <= $2
      RETURNING id, project_id
    `, [USER_ID, CUTOFF_DATE]);
    console.log(`Deleted ${assignmentsResult.rowCount} project assignments`);
    if (assignmentsResult.rows.length > 0) {
      console.log(`  Project IDs: ${assignmentsResult.rows.map((r: any) => r.project_id).join(', ')}`);
    }

    // 2. Delete old applications
    const applicationsResult = await client.query(`
      DELETE FROM applications
      WHERE volunteer_id = $1
      AND created_at <= $2
      RETURNING id, opportunity_id
    `, [USER_ID, CUTOFF_DATE]);
    console.log(`Deleted ${applicationsResult.rowCount} applications`);

    // 3. Delete old volunteer activities
    const activitiesResult = await client.query(`
      DELETE FROM volunteer_activities
      WHERE user_id = $1
      AND date <= $2
      RETURNING id, project_id
    `, [USER_ID, CUTOFF_DATE]);
    console.log(`Deleted ${activitiesResult.rowCount} volunteer activities`);

    // 4. Delete old volunteer-organization relationships
    try {
      const relResult = await client.query(`
        DELETE FROM volunteer_organization_relationships
        WHERE volunteer_id = $1
        AND created_at <= $2
        RETURNING id
      `, [USER_ID, CUTOFF_DATE]);
      console.log(`Deleted ${relResult.rowCount} volunteer-organization relationships`);
    } catch (err: any) {
      if (err.code !== '42P01') {
        console.log(`Warning: Could not clean volunteer_organization_relationships: ${err.message}`);
      }
    }

    // 5. Delete old notifications
    try {
      const notifsResult = await client.query(`
        DELETE FROM notifications
        WHERE user_id = $1
        AND created_at <= $2
        RETURNING id
      `, [USER_ID, CUTOFF_DATE]);
      console.log(`Deleted ${notifsResult.rowCount} notifications`);
    } catch (err: any) {
      if (err.code !== '42P01') {
        console.log(`Warning: Could not clean notifications: ${err.message}`);
      }
    }

    // 6. Show remaining data
    const remainingAssignments = await client.query(`
      SELECT pa.id, pa.project_id, pa.status, pa.created_at, p.name as project_name
      FROM project_assignments pa
      LEFT JOIN projects p ON pa.project_id = p.id
      WHERE pa.volunteer_id = $1
      ORDER BY pa.created_at DESC
    `, [USER_ID]);
    console.log(`\nRemaining project assignments: ${remainingAssignments.rowCount}`);
    remainingAssignments.rows.forEach((r: any) => {
      console.log(`  - [${r.status}] ${r.project_name || 'Unknown project'} (id: ${r.project_id}, created: ${r.created_at})`);
    });

    const remainingApps = await client.query(`
      SELECT a.id, a.opportunity_id, a.status, a.created_at, o.title as opp_title
      FROM applications a
      LEFT JOIN opportunities o ON a.opportunity_id = o.id
      WHERE a.volunteer_id = $1
      ORDER BY a.created_at DESC
    `, [USER_ID]);
    console.log(`\nRemaining applications: ${remainingApps.rowCount}`);
    remainingApps.rows.forEach((r: any) => {
      console.log(`  - [${r.status}] ${r.opp_title || 'Unknown opportunity'} (created: ${r.created_at})`);
    });

    await client.query('COMMIT');
    console.log('\nCleanup completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed, rolled back:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupAlHonorat()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
