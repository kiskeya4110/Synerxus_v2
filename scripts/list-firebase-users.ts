import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

async function main() {
  const auth = getAuth();
  const result = await auth.listUsers(1000);
  console.log(`=== ALL FIREBASE USERS (${result.users.length}) ===`);
  result.users.forEach(u => {
    console.log(JSON.stringify({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || null,
      emailVerified: u.emailVerified,
      created: u.metadata.creationTime,
    }));
  });
}
main().catch(e => console.error(e.message));
