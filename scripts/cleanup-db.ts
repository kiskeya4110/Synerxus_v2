import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const gfaId = '0dcf47f5-7f90-4e58-870a-5b165a0e2675';

  // Get FK refs to matchable_organizations
  const fks = await pool.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'matchable_organizations'
  `);

  // Get IDs to delete (everything except Green Future Alliance)
  const matchOrgs = await pool.query('SELECT id, name FROM matchable_organizations');
  const deleteIds = matchOrgs.rows.filter(r => r.id !== gfaId).map(r => r.id);
  console.log('Deleting', deleteIds.length, 'test matchable orgs...');

  // Clean FK refs
  for (const fk of fks.rows) {
    for (const delId of deleteIds) {
      try {
        const res = await pool.query(`DELETE FROM ${fk.table_name} WHERE ${fk.column_name} = $1`, [delId]);
        if (res.rowCount && res.rowCount > 0) console.log('  Cleaned', res.rowCount, 'from', fk.table_name);
      } catch(e) {}
    }
  }

  // Delete test matchable orgs
  for (const delId of deleteIds) {
    await pool.query('DELETE FROM matchable_organizations WHERE id = $1', [delId]);
  }
  console.log('Done cleaning matchable_organizations');

  // Create volunteer_profile for user 4 (Al Honorat)
  const existing = await pool.query('SELECT id FROM volunteer_profiles WHERE user_id = 4');
  if (existing.rows.length === 0) {
    await pool.query(`
      INSERT INTO volunteer_profiles (
        user_id, volunteer_name, location, skills, preferred_sdgs,
        weekly_availability, preferred_work_style, onboarding_completed,
        experience_level, email_digest_enabled, overall_rating, preferred_commitment
      ) VALUES (
        4, 'Al Honorat', 'Haiti',
        '{Engineering,Agriculture,Marketing/Comms}',
        '{4,8,10}',
        20, 'hybrid', true,
        'advanced', true, 0, 'flexible'
      )
    `);
    console.log('Created volunteer_profile for user 4 (Al Honorat)');
  } else {
    console.log('User 4 already has a volunteer_profile');
  }

  // Verify final state
  const finalMatchOrgs = await pool.query('SELECT id, name FROM matchable_organizations');
  console.log('\nMatchable orgs remaining:', finalMatchOrgs.rows.length);
  finalMatchOrgs.rows.forEach(r => console.log('  ', r.name));

  const profiles = await pool.query('SELECT user_id, volunteer_name, skills FROM volunteer_profiles ORDER BY user_id');
  console.log('\nVolunteer profiles:');
  profiles.rows.forEach(r => console.log('  user', r.user_id, '|', r.volunteer_name, '| skills:', r.skills));

  const activities = await pool.query('SELECT id, user_id, status, hours, outcome_type FROM volunteer_activities ORDER BY id');
  console.log('\nVolunteer activities:', activities.rows.length, 'records');
  activities.rows.forEach(r => console.log('  ID', r.id, '| user', r.user_id, '|', r.status, '|', r.hours + 'h', '|', r.outcome_type || '-'));

  const assignments = await pool.query('SELECT project_id, volunteer_id, status, hours_completed FROM project_assignments ORDER BY id');
  console.log('\nProject assignments:');
  assignments.rows.forEach(r => console.log('  project', r.project_id, '| volunteer', r.volunteer_id, '|', r.status, '|', r.hours_completed + 'h'));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
