import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Get org profiles schema
  const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'organization_profiles' ORDER BY ordinal_position`);
  console.log('=== ORGANIZATION PROFILES COLUMNS ===');
  cols.rows.forEach((r: any) => console.log(`  ${r.column_name}`));

  // Get org profiles data
  const oprofiles = await pool.query('SELECT * FROM organization_profiles ORDER BY id');
  console.log(`\n=== ORGANIZATION PROFILES (${oprofiles.rows.length}) ===`);
  oprofiles.rows.forEach((r: any) => console.log(`  ${JSON.stringify(r)}`));

  // Check organizations table
  const orgs = await pool.query('SELECT id, name, approval_status FROM organizations ORDER BY id');
  console.log(`\n=== ORGANIZATIONS (${orgs.rows.length}) ===`);
  orgs.rows.forEach((r: any) => console.log(`  org ${r.id} | ${r.name} | status: ${r.approval_status}`));

  // Check users with organization_id set
  const orgUsers = await pool.query('SELECT id, email, user_type, organization_id FROM users WHERE organization_id IS NOT NULL ORDER BY id');
  console.log(`\n=== USERS WITH ORGANIZATION_ID (${orgUsers.rows.length}) ===`);
  orgUsers.rows.forEach((r: any) => console.log(`  user ${r.id} | ${r.email} | type: ${r.user_type} | org: ${r.organization_id}`));

  // Check which org-type users DON'T have organization_id
  const orgUsersNoOrg = await pool.query("SELECT id, email, user_type, organization_id FROM users WHERE user_type IN ('organization', 'corporate-partner') AND organization_id IS NULL ORDER BY id");
  console.log(`\n=== ORG/CORP USERS WITHOUT ORGANIZATION_ID (${orgUsersNoOrg.rows.length}) ===`);
  orgUsersNoOrg.rows.forEach((r: any) => console.log(`  user ${r.id} | ${r.email} | type: ${r.user_type}`));

  // Check volunteer users without volunteer_profiles
  const volNoProfile = await pool.query(`
    SELECT u.id, u.email FROM users u
    LEFT JOIN volunteer_profiles vp ON vp.user_id = u.id
    WHERE u.user_type = 'volunteer' AND vp.id IS NULL
    ORDER BY u.id
  `);
  console.log(`\n=== VOLUNTEERS WITHOUT PROFILES (${volNoProfile.rows.length}) ===`);
  volNoProfile.rows.forEach((r: any) => console.log(`  user ${r.id} | ${r.email}`));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
