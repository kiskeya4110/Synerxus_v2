/**
 * Script to generate an invitation code for a specific email
 * Run with: npx tsx scripts/generate-invitation-code.ts
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { randomBytes } from 'crypto';

neonConfig.webSocketConstructor = ws;

function generateInviteCode(length: number = 8): string {
  return randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

async function generateInvitationCode() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const email = 'Impactamexicoac@gmail.com';
  const code = generateInviteCode(8);

  console.log(`\n📧 Generating invitation code for: ${email}\n`);

  try {
    // Check if an active code already exists for this email
    const existing = await pool.query(
      `SELECT * FROM invitation_codes WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠️ An active invitation code already exists for this email:`);
      console.log(`   Code: ${existing.rows[0].code}`);
      console.log(`   Created: ${existing.rows[0].created_at}`);
      console.log(`   Used: ${existing.rows[0].used_count}/${existing.rows[0].max_uses || 'unlimited'}`);
      return;
    }

    // Insert the new invitation code
    const result = await pool.query(
      `INSERT INTO invitation_codes (code, email, user_type, max_uses, is_active, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [code, email, 'organization', 1, true, 'Generated for Impacta Mexico AC']
    );

    const newCode = result.rows[0];
    console.log(`✅ Invitation code created successfully!\n`);
    console.log(`   Code: ${newCode.code}`);
    console.log(`   Email: ${newCode.email}`);
    console.log(`   User Type: ${newCode.user_type}`);
    console.log(`   Max Uses: ${newCode.max_uses}`);
    console.log(`   Created: ${newCode.created_at}`);

  } catch (error) {
    console.error('Error generating invitation code:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

generateInvitationCode().catch(console.error);
