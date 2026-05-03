import admin from "firebase-admin";
import { logger } from "../logger";

let firebaseApp: admin.app.App | null = null;

function initializeFirebaseAdmin(): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Validate all credentials are present and non-empty
  if (!projectId || !clientEmail || !privateKey) {
    logger.warn(
      "[FirebaseAdmin] Missing Firebase credentials. Firebase token verification disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to enable."
    );
    return null;
  }

  // Validate privateKey format (should start with -----BEGIN)
  if (!privateKey.includes('-----BEGIN')) {
    logger.warn(
      "[FirebaseAdmin] Invalid Firebase private key format. Firebase token verification disabled."
    );
    return null;
  }

  try {
    // Check if app is already initialized by checking apps array
    if (admin.apps && admin.apps.length > 0) {
      firebaseApp = admin.apps[0] || null;
      return firebaseApp;
    }

    // Verify admin.credential is available before calling cert
    if (!admin.credential || typeof admin.credential.cert !== 'function') {
      logger.error("[FirebaseAdmin] Firebase Admin SDK credential module not available");
      return null;
    }

    const credential = admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });

    firebaseApp = admin.initializeApp({
      credential,
    });
    logger.info("[FirebaseAdmin] Firebase Admin SDK initialized successfully");
    return firebaseApp;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[FirebaseAdmin] Failed to initialize Firebase Admin:", errorMessage);
    return null;
  }
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<admin.auth.DecodedIdToken | null> {
  const app = initializeFirebaseAdmin();
  if (!app) {
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.warn("[FirebaseAdmin] Token verification failed:", error);
    return null;
  }
}

export function getFirebaseAuth(): admin.auth.Auth | null {
  const app = initializeFirebaseAdmin();
  if (!app) {
    return null;
  }
  return admin.auth();
}
