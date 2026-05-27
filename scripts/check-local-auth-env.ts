import "dotenv/config";

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const productionRequired = [
  "APP_ORIGIN",
  "CORS_WHITELIST",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

const missing = required.filter((key) => !process.env[key]?.trim());
const missingProduction =
  process.env.NODE_ENV === "production"
    ? productionRequired.filter((key) => !process.env[key]?.trim())
    : [];

if (missing.length || missingProduction.length) {
  console.error("\nLocal auth configuration is incomplete.");
  if (missing.length) {
    console.error("\nRequired for local login:");
    missing.forEach((key) => console.error(`  - ${key}`));
  }
  if (missingProduction.length) {
    console.error("\nRequired when NODE_ENV=production:");
    missingProduction.forEach((key) => console.error(`  - ${key}`));
  }
  console.error("\nFix:");
  console.error("  1. Copy .env.example to .env.");
  console.error("  2. Copy the same Firebase, database, and JWT secrets used in Replit.");
  console.error("  3. In Firebase Auth settings, add localhost to Authorized domains.");
  console.error("  4. Run npm run check:local-auth again.\n");
  process.exit(1);
}

const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN!;
if (!authDomain.endsWith(".firebaseapp.com") && !authDomain.endsWith(".web.app")) {
  console.warn(
    `Warning: VITE_FIREBASE_AUTH_DOMAIN usually ends with .firebaseapp.com or .web.app. Current value: ${authDomain}`,
  );
}

if (process.env.FIREBASE_PRIVATE_KEY?.includes("\\n") === false) {
  console.warn(
    "Warning: FIREBASE_PRIVATE_KEY should usually contain literal \\n newline escapes in .env.",
  );
}

console.log("Local auth configuration looks complete.");
console.log("Remember: localhost must be listed in Firebase Console -> Authentication -> Settings -> Authorized domains.");
