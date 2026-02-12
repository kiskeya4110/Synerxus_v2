import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Organization emails - these are clearly org/corporate accounts based on domain
const orgEmails = new Set([
  'info@thezambiaiwant.org',
  'kmumba@operationidream.org',
  'impactamexicoac@gmail.com',  // Organization name in email
  'idream@operationidream.org',
  'support@limitlessfoundationzm.org',
  'contact@gfa.org',
  'csr@buildsmart.com',
]);

// Corporate partner emails
const corporateEmails = new Set([
  'csr@buildsmart.com',
]);

function getUserType(email: string): string {
  if (corporateEmails.has(email)) return 'corporate-partner';
  if (orgEmails.has(email)) return 'organization';
  return 'volunteer';
}

function generateUsername(email: string, displayName: string | null): string {
  // Use display name if available, otherwise use email prefix
  if (displayName) {
    return displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const auth = getAuth();

  // Get all Firebase users
  const result = await auth.listUsers(1000);
  console.log(`Found ${result.users.length} Firebase users`);

  // Get all existing users from DB
  const dbUsers = await pool.query('SELECT id, email, firebase_uid FROM users');
  const existingEmails = new Set(dbUsers.rows.map((r: any) => r.email));
  const existingUsernames = new Set(
    (await pool.query('SELECT username FROM users')).rows.map((r: any) => r.username)
  );

  console.log(`Existing DB users: ${dbUsers.rows.length}`);
  console.log(`Existing emails: ${Array.from(existingEmails).join(', ')}`);

  let created = 0;
  let skipped = 0;

  for (const fbUser of result.users) {
    if (!fbUser.email) {
      console.log(`  SKIP: Firebase user ${fbUser.uid} has no email`);
      skipped++;
      continue;
    }

    if (existingEmails.has(fbUser.email)) {
      // Check if firebase_uid needs updating
      const existing = dbUsers.rows.find((r: any) => r.email === fbUser.email);
      if (existing && !existing.firebase_uid) {
        await pool.query('UPDATE users SET firebase_uid = $1 WHERE email = $2', [fbUser.uid, fbUser.email]);
        console.log(`  UPDATED firebase_uid for ${fbUser.email}`);
      } else {
        console.log(`  SKIP: ${fbUser.email} already exists in DB`);
      }
      skipped++;
      continue;
    }

    const userType = getUserType(fbUser.email);
    let username = generateUsername(fbUser.email, fbUser.displayName || null);

    // Ensure unique username
    let suffix = 1;
    let uniqueUsername = username;
    while (existingUsernames.has(uniqueUsername)) {
      uniqueUsername = `${username}_${suffix}`;
      suffix++;
    }
    username = uniqueUsername;
    existingUsernames.add(username);

    const displayName = fbUser.displayName || fbUser.email.split('@')[0];

    try {
      const insertResult = await pool.query(
        `INSERT INTO users (firebase_uid, username, email, user_type, display_name, data_consent, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         RETURNING id, email, user_type`,
        [fbUser.uid, username, fbUser.email, userType, displayName]
      );
      const newUser = insertResult.rows[0];
      console.log(`  CREATED: ID ${newUser.id} | ${newUser.email} | ${newUser.user_type} | username: ${username}`);
      created++;
    } catch (e: any) {
      console.error(`  ERROR creating ${fbUser.email}: ${e.message}`);
    }
  }

  console.log(`\n=== SYNC COMPLETE ===`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);

  // Show final state
  const finalUsers = await pool.query('SELECT id, email, user_type, firebase_uid, display_name FROM users ORDER BY id');
  console.log(`\n=== ALL PLATFORM USERS (${finalUsers.rows.length}) ===`);
  finalUsers.rows.forEach((r: any) => {
    console.log(`  ID ${r.id} | ${r.email} | ${r.user_type} | ${r.display_name} | firebase: ${r.firebase_uid ? 'YES' : 'NO'}`);
  });

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
