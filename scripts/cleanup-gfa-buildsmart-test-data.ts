/**
 * Cleanup: Remove all records created by the GFA + BuildSmart seed batch
 *
 * Identifies records by:
 *   - volunteer_activities.device_id = 'gfa-buildsmart-jan-may-2026-test-seed'
 *   - users.email LIKE '%+gfa-test@buildsmart.example'
 *
 * Safety requirements:
 *   - ALLOW_TEST_SEED=true must be set
 *   - Will not run if NODE_ENV=production
 *
 * Usage:
 *   ALLOW_TEST_SEED=true npx tsx scripts/cleanup-gfa-buildsmart-test-data.ts
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// ── Safety gates ───────────────────────────────────────────────────────────────

if (!process.env.ALLOW_TEST_SEED) {
  console.error(
    "❌  Set ALLOW_TEST_SEED=true to run this script.\n" +
      "    This guard prevents accidental data removal."
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("❌  Refusing to run: NODE_ENV=production.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL must be set.");
  process.exit(1);
}

const SEED_BATCH = "gfa-buildsmart-jan-may-2026-test-seed";
const EMAIL_PATTERN = "%+gfa-test@buildsmart.example";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("\n══════════════════════════════════════════════════════");
  console.log(`  Cleanup — Batch: ${SEED_BATCH}`);
  console.log("══════════════════════════════════════════════════════\n");

  try {
    // ── Identify seed user IDs ─────────────────────────────────────────────
    const seedUserResult = await pool.query(
      `SELECT id FROM users WHERE email LIKE $1`,
      [EMAIL_PATTERN]
    );
    const seedUserIds: number[] = seedUserResult.rows.map((r) => r.id);
    console.log(`Seed users found:  ${seedUserIds.length}`);

    // ── Identify seed activity IDs ─────────────────────────────────────────
    const seedActivityResult = await pool.query(
      `SELECT id FROM volunteer_activities WHERE device_id = $1`,
      [SEED_BATCH]
    );
    const seedActivityIds: number[] = seedActivityResult.rows.map((r) => r.id);
    console.log(`Seed activities found:  ${seedActivityIds.length}`);

    if (seedUserIds.length === 0 && seedActivityIds.length === 0) {
      console.log("\n✅  Nothing to clean up — seed batch not found.");
      return;
    }

    const userIdList = seedUserIds.length > 0 ? seedUserIds.join(",") : "0";
    const activityIdList = seedActivityIds.length > 0 ? seedActivityIds.join(",") : "0";

    console.log("\nRemoving records in dependency order…\n");

    // ── Deletion order (child tables first) ───────────────────────────────
    const steps: Array<{ label: string; sql: string; params?: any[] }> = [
      // 1. verified_outputs linked to seed activities
      {
        label: "verified_outputs (linked to seed activities)",
        sql: `DELETE FROM verified_outputs WHERE activity_id IN (${activityIdList})`,
      },
      // 2. verification_audit_log linked to seed activities
      {
        label: "verification_audit_log (linked to seed activities)",
        sql: `DELETE FROM verification_audit_log WHERE activity_id IN (${activityIdList})`,
      },
      // 3. volunteer_activities (the seed activities themselves)
      {
        label: "volunteer_activities (seed batch)",
        sql: `DELETE FROM volunteer_activities WHERE device_id = $1`,
        params: [SEED_BATCH],
      },
      // 4. project_assignments for seed users
      {
        label: "project_assignments (seed users)",
        sql: seedUserIds.length > 0
          ? `DELETE FROM project_assignments WHERE volunteer_id IN (${userIdList})`
          : `SELECT 0`,
      },
      // 5. volunteer_organization_relationships for seed users
      {
        label: "volunteer_organization_relationships (seed users)",
        sql: seedUserIds.length > 0
          ? `DELETE FROM volunteer_organization_relationships WHERE volunteer_id IN (${userIdList})`
          : `SELECT 0`,
      },
      // 6. volunteer_profiles for seed users
      {
        label: "volunteer_profiles (seed users)",
        sql: seedUserIds.length > 0
          ? `DELETE FROM volunteer_profiles WHERE user_id IN (${userIdList})`
          : `SELECT 0`,
      },
      // 7. user_badges for seed users
      {
        label: "user_badges (seed users)",
        sql: seedUserIds.length > 0
          ? `DELETE FROM user_badges WHERE user_id IN (${userIdList})`
          : `SELECT 0`,
      },
      // 8. leaderboard_stats for seed users
      {
        label: "leaderboard_stats (seed users)",
        sql: seedUserIds.length > 0
          ? `DELETE FROM leaderboard_stats WHERE user_id IN (${userIdList})`
          : `SELECT 0`,
      },
      // 9. notifications for seed users
      {
        label: "notifications (seed users)",
        sql: seedUserIds.length > 0
          ? `DELETE FROM notifications WHERE user_id IN (${userIdList})`
          : `SELECT 0`,
      },
      // 10. users (seed volunteers themselves)
      {
        label: "users (seed volunteers)",
        sql: `DELETE FROM users WHERE email LIKE $1`,
        params: [EMAIL_PATTERN],
      },
    ];

    for (const step of steps) {
      try {
        const result = await pool.query(step.sql, step.params ?? []);
        const rowCount = result.rowCount ?? 0;
        if (rowCount > 0) {
          console.log(`  ✓ ${step.label}: ${rowCount} row${rowCount !== 1 ? "s" : ""} deleted`);
        }
      } catch (err: any) {
        // 42P01 = relation does not exist (table absent, safe to skip)
        // 23503 = foreign key violation (shouldn't happen with this order)
        if (err.code === "42P01") {
          // table absent — skip silently
        } else {
          console.warn(`  ⚠  ${step.label}: ${err.message}`);
        }
      }
    }

    // ── Verification ──────────────────────────────────────────────────────
    const remaining = await pool.query(
      `SELECT COUNT(*) FROM volunteer_activities WHERE device_id = $1`,
      [SEED_BATCH]
    );
    const remainingUsers = await pool.query(
      `SELECT COUNT(*) FROM users WHERE email LIKE $1`,
      [EMAIL_PATTERN]
    );

    console.log("\n══════════════════════════════════════════════════════");
    console.log("  Cleanup complete");
    console.log("══════════════════════════════════════════════════════");
    console.log(`  Activities remaining with batch marker: ${remaining.rows[0].count}`);
    console.log(`  Seed users remaining:                   ${remainingUsers.rows[0].count}`);

    const allClear =
      Number(remaining.rows[0].count) === 0 &&
      Number(remainingUsers.rows[0].count) === 0;
    console.log(allClear ? "\n  ✅  All seed records removed." : "\n  ⚠   Some records may remain — check above.");
    console.log();
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("❌  Cleanup failed:", err?.message ?? err);
  process.exit(1);
});
