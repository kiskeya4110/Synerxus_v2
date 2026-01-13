/**
 * Script to apply external volunteers migration to the database
 * Run with: npx tsx scripts/apply-external-volunteers-migration.ts
 */

import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function applyMigration() {
  console.log('Applying external volunteers migration...\n');

  const migrationSql = fs.readFileSync('./migrations/0005_add_external_volunteers.sql', 'utf-8');

  // Remove all comment lines and split by semicolon
  const cleanedSql = migrationSql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let applied = 0;
  let skipped = 0;
  let errors = 0;

  for (const stmt of statements) {
    if (stmt) {
      try {
        await db.execute(sql.raw(stmt));
        const preview = stmt.replace(/\n/g, ' ').substring(0, 70);
        console.log(`✓ Applied: ${preview}...`);
        applied++;
      } catch (e: any) {
        if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
          const preview = stmt.replace(/\n/g, ' ').substring(0, 70);
          console.log(`⊘ Skipped (exists): ${preview}...`);
          skipped++;
        } else {
          console.error(`✗ Error executing: ${stmt.substring(0, 100)}...`);
          console.error(`  Message: ${e.message}`);
          errors++;
        }
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Applied: ${applied}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);

  process.exit(errors > 0 ? 1 : 0);
}

applyMigration().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
