import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Project impacts
  const impacts = await pool.query('SELECT * FROM project_impacts WHERE user_id = 4 ORDER BY id');
  console.log(`=== PROJECT IMPACTS (${impacts.rows.length}) ===`);
  impacts.rows.forEach((r: any) => console.log(JSON.stringify(r)));

  // Leaderboard stats
  const leaderboard = await pool.query('SELECT * FROM leaderboard_stats WHERE user_id = 4');
  console.log(`\n=== LEADERBOARD STATS ===`);
  leaderboard.rows.forEach((r: any) => console.log(JSON.stringify(r)));

  // Volunteer org relationships
  const rels = await pool.query('SELECT * FROM volunteer_organization_relationships WHERE volunteer_id = 4');
  console.log(`\n=== VOLUNTEER ORG RELATIONSHIPS ===`);
  rels.rows.forEach((r: any) => console.log(JSON.stringify(r)));

  // Applications
  const apps = await pool.query('SELECT * FROM applications WHERE volunteer_id = 4');
  console.log(`\n=== APPLICATIONS ===`);
  apps.rows.forEach((r: any) => console.log(JSON.stringify(r)));

  // Check projects 21 and 23
  const projects = await pool.query('SELECT id, name, organization_id, status, sdg_goals FROM projects WHERE id IN (21, 23)');
  console.log(`\n=== PROJECTS ===`);
  projects.rows.forEach((r: any) => console.log(JSON.stringify(r)));

  // Check what the volunteer impact summary API returns
  // Look at volunteer_activities with all fields
  const fullActivities = await pool.query('SELECT * FROM volunteer_activities WHERE user_id = 4 ORDER BY id');
  console.log(`\n=== FULL VOLUNTEER ACTIVITIES ===`);
  fullActivities.rows.forEach((r: any) => console.log(JSON.stringify(r)));

  // Check volunteer_activities column names
  const cols = await pool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'volunteer_activities' ORDER BY ordinal_position
  `);
  console.log(`\n=== VOLUNTEER_ACTIVITIES COLUMNS ===`);
  cols.rows.forEach((r: any) => console.log(`  ${r.column_name} (${r.data_type})`));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
