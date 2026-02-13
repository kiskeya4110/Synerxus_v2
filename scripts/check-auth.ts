import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Check all users have firebase_uid
  const users = await pool.query('SELECT id, email, firebase_uid, user_type, display_name FROM users ORDER BY id');
  console.log('=== ALL USERS - FIREBASE UID CHECK ===');
  let missingUid = 0;
  let missingType = 0;
  users.rows.forEach((r: any) => {
    const status = r.firebase_uid ? 'OK' : 'MISSING firebase_uid!';
    if (!r.firebase_uid) missingUid++;
    if (!r.user_type) missingType++;
    console.log(`  ID ${r.id} | ${r.email} | type: ${r.user_type || 'NULL'} | uid: ${r.firebase_uid ? r.firebase_uid.substring(0, 12) + '...' : 'NULL'} | ${status}`);
  });
  console.log(`\nUsers missing firebase_uid: ${missingUid}`);
  console.log(`Users missing user_type: ${missingType}`);

  // Check for invite-only mode setting
  try {
    const settings = await pool.query("SELECT key, value FROM platform_settings WHERE key = 'invite_only_mode'");
    console.log('\n=== INVITE ONLY MODE ===');
    if (settings.rows.length > 0) {
      console.log(`invite_only_mode: ${settings.rows[0].value}`);
    } else {
      console.log('No invite_only_mode setting found');
    }
  } catch (e: any) {
    console.log('\n=== INVITE ONLY MODE ===');
    console.log(`platform_settings table issue: ${e.message}`);
  }

  // Check preapproved emails
  try {
    const preapproved = await pool.query("SELECT email FROM preapproved_emails LIMIT 20");
    console.log('\n=== PREAPPROVED EMAILS ===');
    if (preapproved.rows.length > 0) {
      preapproved.rows.forEach((r: any) => console.log(`  ${r.email}`));
    } else {
      console.log('No preapproved emails found');
    }
  } catch (e: any) {
    console.log('\n=== PREAPPROVED EMAILS ===');
    console.log(`Table issue: ${e.message}`);
  }

  // Check volunteer_profiles
  const vprofiles = await pool.query('SELECT id, user_id FROM volunteer_profiles ORDER BY user_id');
  console.log('\n=== VOLUNTEER PROFILES ===');
  console.log(`${vprofiles.rows.length} profiles:`);
  vprofiles.rows.forEach((r: any) => console.log(`  profile ${r.id} -> user ${r.user_id}`));

  // Check organization_profiles
  const oprofiles = await pool.query('SELECT id, user_id, organization_id FROM organization_profiles ORDER BY user_id');
  console.log('\n=== ORGANIZATION PROFILES ===');
  console.log(`${oprofiles.rows.length} profiles:`);
  oprofiles.rows.forEach((r: any) => console.log(`  profile ${r.id} -> user ${r.user_id}, org ${r.organization_id}`));

  // Check organizations
  const orgs = await pool.query('SELECT id, name, approval_status FROM organizations ORDER BY id');
  console.log('\n=== ORGANIZATIONS ===');
  console.log(`${orgs.rows.length} orgs:`);
  orgs.rows.forEach((r: any) => console.log(`  org ${r.id} | ${r.name} | ${r.approval_status}`));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
