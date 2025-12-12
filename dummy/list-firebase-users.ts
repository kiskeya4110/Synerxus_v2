/**
 * List all Firebase Auth users
 * Run with: tsx dummy/list-firebase-users.ts
 */

import admin from 'firebase-admin';

async function initializeFirebaseAdmin(): Promise<boolean> {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin credentials not configured');
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

    return true;
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    return false;
  }
}

async function listAllUsers() {
  console.log('📋 Listing all Firebase Auth users...\n');

  const initialized = await initializeFirebaseAdmin();
  if (!initialized) {
    process.exit(1);
  }

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    
    console.log(`Found ${listUsersResult.users.length} users:\n`);
    console.log('UID'.padEnd(30) + 'Email'.padEnd(35) + 'Display Name'.padEnd(25) + 'Created');
    console.log('-'.repeat(110));
    
    for (const user of listUsersResult.users) {
      const created = user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString().split('T')[0] : 'N/A';
      console.log(
        (user.uid || 'N/A').padEnd(30) +
        (user.email || 'N/A').padEnd(35) +
        (user.displayName || 'N/A').padEnd(25) +
        created
      );
    }
    
    console.log('\n');
  } catch (error: any) {
    console.error('Failed to list users:', error.message);
    process.exit(1);
  }
}

listAllUsers();
