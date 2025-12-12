/**
 * Firebase User Sync Script
 * Creates Firebase Auth users and syncs their UIDs with the PostgreSQL database
 * Run with: tsx dummy/sync-firebase-users.ts
 */

import admin from 'firebase-admin';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const TEST_PASSWORD = 'SynerxusTest123!';

interface UserToSync {
  email: string;
  displayName: string;
  password: string;
}

const USERS_TO_SYNC: UserToSync[] = [
  { email: 'sarah@volunteers.com', displayName: 'Sarah Johnson', password: TEST_PASSWORD },
  { email: 'michael@volunteers.com', displayName: 'Michael Chen', password: TEST_PASSWORD },
  { email: 'emma@volunteers.com', displayName: 'Emma Rodriguez', password: TEST_PASSWORD },
  { email: 'admin@wateraid.org', displayName: 'WaterAid Admin', password: TEST_PASSWORD },
  { email: 'admin@educate.org', displayName: 'Educate Global Admin', password: TEST_PASSWORD },
  { email: 'admin@healthaccess.org', displayName: 'Health Access Admin', password: TEST_PASSWORD },
];

async function initializeFirebaseAdmin(): Promise<boolean> {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Firebase Admin credentials not configured');
      console.error('Required environment variables:');
      console.error('  - FIREBASE_PROJECT_ID');
      console.error('  - FIREBASE_CLIENT_EMAIL');
      console.error('  - FIREBASE_PRIVATE_KEY');
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

async function createOrGetFirebaseUser(user: UserToSync): Promise<string | null> {
  try {
    const existingUser = await admin.auth().getUserByEmail(user.email);
    console.log(`  ✓ Found existing Firebase user: ${user.email} (${existingUser.uid})`);
    return existingUser.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      try {
        const newUser = await admin.auth().createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });
        console.log(`  ✓ Created new Firebase user: ${user.email} (${newUser.uid})`);
        return newUser.uid;
      } catch (createError: any) {
        console.error(`  ✗ Failed to create user ${user.email}:`, createError.message);
        return null;
      }
    }
    console.error(`  ✗ Error checking user ${user.email}:`, error.message);
    return null;
  }
}

async function syncUserToDatabase(email: string, firebaseUid: string): Promise<boolean> {
  try {
    const result = await db
      .update(users)
      .set({ firebaseUid })
      .where(eq(users.email, email))
      .returning();

    if (result.length > 0) {
      console.log(`  ✓ Updated database user ${email} with Firebase UID`);
      return true;
    } else {
      console.log(`  ⚠ No database user found for ${email}`);
      return false;
    }
  } catch (error: any) {
    console.error(`  ✗ Failed to update database for ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Starting Firebase User Sync...\n');

  const initialized = await initializeFirebaseAdmin();
  if (!initialized) {
    process.exit(1);
  }

  console.log('\n📋 Processing users...\n');

  let successCount = 0;
  let failCount = 0;

  for (const user of USERS_TO_SYNC) {
    console.log(`Processing: ${user.email}`);
    
    const firebaseUid = await createOrGetFirebaseUser(user);
    
    if (firebaseUid) {
      const synced = await syncUserToDatabase(user.email, firebaseUid);
      if (synced) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
    
    console.log('');
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Successfully synced: ${successCount} users`);
  console.log(`  ❌ Failed: ${failCount} users`);
  
  if (successCount > 0) {
    console.log('\n🔑 Test Credentials:');
    console.log(`  Password for all users: ${TEST_PASSWORD}`);
    console.log('\n  Volunteer accounts:');
    console.log('    - sarah@volunteers.com');
    console.log('    - michael@volunteers.com');
    console.log('    - emma@volunteers.com');
    console.log('\n  Organization accounts:');
    console.log('    - admin@wateraid.org');
    console.log('    - admin@educate.org');
    console.log('    - admin@healthaccess.org');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
