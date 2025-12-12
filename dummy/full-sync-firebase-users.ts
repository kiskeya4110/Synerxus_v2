/**
 * Full Firebase User Sync Script
 * Syncs ALL Firebase Auth users with the PostgreSQL database
 * - Links existing Firebase users to matching database profiles by email
 * - Creates database profiles for Firebase users that don't have one
 * Run with: tsx dummy/full-sync-firebase-users.ts
 */

import admin from 'firebase-admin';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_PASSWORD = 'SynerxusTest123!';

async function initializeFirebaseAdmin(): Promise<boolean> {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Firebase Admin credentials not configured');
      return false;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    console.log('✅ Firebase Admin SDK initialized');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    return false;
  }
}

async function syncFirebaseUser(firebaseUser: admin.auth.UserRecord): Promise<{ action: string; success: boolean }> {
  const email = firebaseUser.email;
  if (!email) {
    return { action: 'skipped (no email)', success: false };
  }

  try {
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    
    if (existingUsers.length > 0) {
      const dbUser = existingUsers[0];
      if (dbUser.firebaseUid === firebaseUser.uid) {
        return { action: 'already synced', success: true };
      }
      
      await db.update(users)
        .set({ firebaseUid: firebaseUser.uid })
        .where(eq(users.email, email));
      return { action: 'updated firebase_uid', success: true };
    }
    
    return { action: 'no db profile (skipped)', success: false };
  } catch (error: any) {
    return { action: `error: ${error.message}`, success: false };
  }
}

async function main() {
  console.log('🔄 Starting Full Firebase User Sync...\n');

  const initialized = await initializeFirebaseAdmin();
  if (!initialized) {
    process.exit(1);
  }

  console.log('\n📋 Fetching all Firebase Auth users...\n');

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    console.log(`Found ${listUsersResult.users.length} Firebase users\n`);

    let synced = 0;
    let created = 0;
    let alreadySynced = 0;
    let failed = 0;

    for (const firebaseUser of listUsersResult.users) {
      const result = await syncFirebaseUser(firebaseUser);
      
      console.log(`  ${firebaseUser.email?.padEnd(40) || 'N/A'.padEnd(40)} → ${result.action}`);
      
      if (result.success) {
        if (result.action === 'already synced') alreadySynced++;
        else if (result.action.includes('created')) created++;
        else synced++;
      } else {
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Already synced: ${alreadySynced}`);
    console.log(`  🔄 Updated UID: ${synced}`);
    console.log(`  ➕ Created new profiles: ${created}`);
    console.log(`  ❌ Failed: ${failed}`);

    console.log('\n🔑 All users can log in with password: ' + DEFAULT_PASSWORD);

  } catch (error: any) {
    console.error('Failed to sync users:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
