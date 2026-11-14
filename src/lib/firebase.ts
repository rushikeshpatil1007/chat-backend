import "dotenv/config";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestore: Firestore | undefined;

function getFirebaseAdminApp(): App {
  const existingApp = getApps().find((app) => app.name === "[DEFAULT]");
  if (existingApp) {
    return existingApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY must be configured"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId
  });
}

export function getFirestoreDb(): Firestore {
  firestore ??= getFirestore(getFirebaseAdminApp());
  return firestore;
}
