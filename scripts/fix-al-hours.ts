import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Current state: 51 hours across 8 activities
  // Target: 62 hours (11 more hours needed)
  // Project 21 (Solar Village Initiative): currently 30h (5 activities)
  // Project 23 (Clean Wells Construction): currently 21h (3 activities)

  // Add 3 more activities to reach 62 total:
  // - Project 21: +5h (field assessment before training) = 35h total
  // - Project 23: +6h (follow-up maintenance and monitoring) = 27h total
  // Total: 35 + 27 = 62h

  // Activity 1: Solar Village - Initial site assessment (pre-training)
  await pool.query(`
    INSERT INTO volunteer_activities (
      user_id, project_id, hours, date, description,
      skills_applied, outcome_type, role, verification_status,
      logged_by_type, created_at, updated_at
    ) VALUES (
      4, 21, 5, '2025-12-10', 'Initial site assessment and community needs evaluation for solar installation program.',
      '{Civil Engineering,Agriculture}', 'individual', 'lead', 'approved',
      'self', NOW(), NOW()
    ) RETURNING id, hours
  `);
  console.log('Added: Project 21 - Initial site assessment (+5h)');

  // Activity 2: Clean Wells - Water system maintenance training
  await pool.query(`
    INSERT INTO volunteer_activities (
      user_id, project_id, hours, date, description,
      skills_applied, outcome_type, role, verification_status,
      logged_by_type, created_at, updated_at
    ) VALUES (
      4, 23, 6, '2026-02-08', 'Follow-up maintenance inspection and community training on well upkeep procedures.',
      '{Civil Engineering,Project Management}', 'shared', 'lead', 'approved',
      'self', NOW(), NOW()
    ) RETURNING id, hours
  `);
  console.log('Added: Project 23 - Maintenance inspection (+6h)');

  // Update project assignments to reflect correct totals
  await pool.query(`UPDATE project_assignments SET hours_completed = 35 WHERE volunteer_id = 4 AND project_id = 21`);
  console.log('Updated: Project 21 assignment hours_completed = 35');

  await pool.query(`UPDATE project_assignments SET hours_completed = 27 WHERE volunteer_id = 4 AND project_id = 23`);
  console.log('Updated: Project 23 assignment hours_completed = 27');

  // Update leaderboard stats
  await pool.query(`UPDATE leaderboard_stats SET total_hours = 62 WHERE user_id = 4`);
  console.log('Updated: Leaderboard stats total_hours = 62');

  // Verify final state
  const activities = await pool.query('SELECT id, project_id, hours, date, description FROM volunteer_activities WHERE user_id = 4 ORDER BY date');
  let total = 0;
  console.log('\n=== FINAL ACTIVITIES ===');
  activities.rows.forEach((r: any) => {
    total += parseFloat(r.hours);
    console.log(`  ID ${r.id} | project ${r.project_id} | ${r.hours}h | ${new Date(r.date).toISOString().split('T')[0]} | ${r.description?.substring(0, 50)}`);
  });
  console.log(`\nTOTAL HOURS: ${total}`);

  const assignments = await pool.query('SELECT project_id, hours_completed FROM project_assignments WHERE volunteer_id = 4');
  console.log('\n=== PROJECT ASSIGNMENTS ===');
  assignments.rows.forEach((r: any) => console.log(`  Project ${r.project_id}: ${r.hours_completed}h`));

  const lb = await pool.query('SELECT total_hours FROM leaderboard_stats WHERE user_id = 4');
  console.log(`\nLeaderboard total_hours: ${lb.rows[0]?.total_hours}`);

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
