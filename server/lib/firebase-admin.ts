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

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn(
      "[FirebaseAdmin] Missing Firebase credentials. Firebase token verification disabled."
    );
    return null;
  }

  try {
    // Check if app is already initialized by checking apps array
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0];
      return firebaseApp;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    logger.info("[FirebaseAdmin] Firebase Admin SDK initialized successfully");
    return firebaseApp;
  } catch (error) {
    logger.error("[FirebaseAdmin] Failed to initialize Firebase Admin:", error);
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
