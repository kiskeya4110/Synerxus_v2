/**
 * Script to apply scalability indexes to the database
 * Run with: npx tsx scripts/apply-scalability-indexes.ts
 */

import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function applyIndexes() {
  console.log('Applying scalability indexes...\n');

  const indexSql = fs.readFileSync('./migrations/0004_add_scalability_indexes.sql', 'utf-8');

  // Remove all comment lines and split by semicolon
  const cleanedSql = indexSql
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
        if (e.message?.includes('already exists')) {
          const preview = stmt.replace(/\n/g, ' ').substring(0, 70);
          console.log(`⊘ Skipped (exists): ${preview}...`);
          skipped++;
        } else {
          console.error(`✗ Error: ${e.message}`);
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

applyIndexes().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
