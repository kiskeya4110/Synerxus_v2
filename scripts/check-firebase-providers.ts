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

  console.log('=== FIREBASE USER AUTH PROVIDERS ===\n');

  let emailPasswordCount = 0;
  let googleOnlyCount = 0;
  let noPasswordCount = 0;

  for (const u of result.users) {
    const providers = u.providerData.map(p => p.providerId);
    const hasPassword = providers.includes('password');
    const hasGoogle = providers.includes('google.com');

    if (hasPassword) emailPasswordCount++;
    if (!hasPassword && hasGoogle) googleOnlyCount++;
    if (!hasPassword && !hasGoogle) noPasswordCount++;

    console.log(`  ${u.email}`);
    console.log(`    providers: [${providers.join(', ')}]`);
    console.log(`    hasPassword: ${hasPassword} | hasGoogle: ${hasGoogle}`);
    console.log(`    emailVerified: ${u.emailVerified}`);
    console.log(`    created: ${u.metadata.creationTime}`);
    console.log('');
  }

  console.log('=== SUMMARY ===');
  console.log(`Total: ${result.users.length}`);
  console.log(`Has email/password: ${emailPasswordCount} (can use email login)`);
  console.log(`Google only (no password): ${googleOnlyCount} (must use Google sign-in)`);
  console.log(`No providers: ${noPasswordCount} (may have login issues)`);
}
main().catch(e => console.error(e.message));
