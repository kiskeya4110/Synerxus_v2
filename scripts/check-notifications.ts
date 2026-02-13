import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Check notifications table exists and schema
  const cols = await pool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'notifications' ORDER BY ordinal_position
  `);
  console.log('=== NOTIFICATIONS TABLE COLUMNS ===');
  cols.rows.forEach((r: any) => console.log(`  ${r.column_name} (${r.data_type})`));

  // Check all notifications for user 4
  const notifs = await pool.query('SELECT * FROM notifications WHERE user_id = 4 ORDER BY created_at DESC');
  console.log(`\n=== NOTIFICATIONS FOR USER 4 (${notifs.rows.length}) ===`);
  notifs.rows.forEach((r: any) => {
    console.log(`  ID ${r.id} | type: ${r.type} | read: ${r.read} | title: ${r.title?.substring(0, 60)} | created: ${r.created_at}`);
  });

  // Check unread count
  const unread = notifs.rows.filter((r: any) => !r.read);
  console.log(`\nUnread: ${unread.length}`);

  // Also check pending approvals for org 11
  const pendingActs = await pool.query(`
    SELECT id, user_id, hours, verification_status, description
    FROM volunteer_activities
    WHERE verification_status IN ('pending', 'self_reported') OR verification_status IS NULL
    ORDER BY id
  `);
  console.log(`\n=== PENDING ACTIVITIES (all orgs) (${pendingActs.rows.length}) ===`);
  pendingActs.rows.forEach((r: any) => console.log(`  ID ${r.id} | user ${r.user_id} | ${r.hours}h | status: ${r.verification_status} | ${r.description?.substring(0, 50)}`));

  // Check pending impacts
  const pendingImpacts = await pool.query(`
    SELECT id, user_id, project_id, verification_status, value
    FROM project_impacts
    WHERE verification_status IN ('pending', 'self_reported') OR verification_status IS NULL
    ORDER BY id
  `);
  console.log(`\n=== PENDING IMPACTS (${pendingImpacts.rows.length}) ===`);
  pendingImpacts.rows.forEach((r: any) => console.log(`  ID ${r.id} | user ${r.user_id} | project ${r.project_id} | status: ${r.verification_status} | value: ${r.value}`));

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
