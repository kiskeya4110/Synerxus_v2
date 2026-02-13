import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // User record
  const user = await pool.query('SELECT * FROM users WHERE id = 4');
  console.log('=== USER 4 (Al Honorat) ===');
  console.log(JSON.stringify(user.rows[0], null, 2));

  // Volunteer profile
  const profile = await pool.query('SELECT * FROM volunteer_profiles WHERE user_id = 4');
  console.log('\n=== VOLUNTEER PROFILE ===');
  console.log(JSON.stringify(profile.rows[0], null, 2));

  // Volunteer activities
  const activities = await pool.query('SELECT * FROM volunteer_activities WHERE user_id = 4 ORDER BY id');
  console.log(`\n=== VOLUNTEER ACTIVITIES (${activities.rows.length} records) ===`);
  let totalHours = 0;
  activities.rows.forEach((r: any) => {
    totalHours += parseFloat(r.hours || 0);
    console.log(`  ID ${r.id} | hours: ${r.hours} | status: ${r.verification_status} | project: ${r.project_id} | org: ${r.organization_id} | date: ${r.date} | outcome: ${r.outcome_type || '-'} / ${r.outcome_quantity || '-'}`);
  });
  console.log(`  TOTAL HOURS: ${totalHours}`);

  // Project assignments
  const assignments = await pool.query('SELECT * FROM project_assignments WHERE volunteer_id = 4 ORDER BY id');
  console.log(`\n=== PROJECT ASSIGNMENTS (${assignments.rows.length}) ===`);
  let assignmentHours = 0;
  assignments.rows.forEach((r: any) => {
    assignmentHours += parseFloat(r.hours_completed || 0);
    console.log(`  ID ${r.id} | project: ${r.project_id} | status: ${r.status} | hours_completed: ${r.hours_completed} | role: ${r.role}`);
  });
  console.log(`  TOTAL ASSIGNMENT HOURS: ${assignmentHours}`);

  // Impact summary / impact_entries if they exist
  try {
    const impact = await pool.query('SELECT * FROM impact_entries WHERE user_id = 4 ORDER BY id');
    console.log(`\n=== IMPACT ENTRIES (${impact.rows.length}) ===`);
    impact.rows.forEach((r: any) => console.log(`  ${JSON.stringify(r)}`));
  } catch (e: any) {
    console.log(`\n=== IMPACT ENTRIES: table not found (${e.message.substring(0, 50)}) ===`);
  }

  // Check volunteer_hours table if exists
  try {
    const hours = await pool.query('SELECT * FROM volunteer_hours WHERE user_id = 4 ORDER BY id');
    console.log(`\n=== VOLUNTEER_HOURS (${hours.rows.length}) ===`);
    hours.rows.forEach((r: any) => console.log(`  ${JSON.stringify(r)}`));
  } catch (e: any) {
    console.log(`\n=== VOLUNTEER_HOURS: table not found ===`);
  }

  // Check all tables that reference user_id = 4
  const tables = await pool.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE column_name IN ('user_id', 'volunteer_id') AND table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('\n=== CHECKING ALL TABLES WITH USER/VOLUNTEER REFERENCES ===');
  for (const t of tables.rows) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as cnt FROM ${t.table_name} WHERE ${t.column_name} = 4`);
      const count = parseInt(result.rows[0].cnt);
      if (count > 0) {
        console.log(`  ${t.table_name}.${t.column_name} = 4: ${count} rows`);
      }
    } catch (e) {}
  }

  // Check what the dashboard API would return - impact summary endpoint
  // Let's check the volunteer_activities aggregation
  const verified = await pool.query(`
    SELECT
      COUNT(*) as total_activities,
      SUM(hours) as total_hours,
      SUM(CASE WHEN verification_status = 'verified' THEN hours ELSE 0 END) as verified_hours,
      SUM(CASE WHEN verification_status = 'pending' THEN hours ELSE 0 END) as pending_hours,
      SUM(CASE WHEN verification_status = 'rejected' THEN hours ELSE 0 END) as rejected_hours,
      COUNT(DISTINCT project_id) as projects_count,
      COUNT(DISTINCT organization_id) as orgs_count
    FROM volunteer_activities WHERE user_id = 4
  `);
  console.log('\n=== ACTIVITY AGGREGATION ===');
  console.log(JSON.stringify(verified.rows[0], null, 2));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
