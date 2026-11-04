'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

// Initialised lazily so nothing touches Firebase during SSR / build.
function auth(): Auth {
  if (!firebaseConfigured) {
    throw new Error(
      'Firebase is not configured (set NEXT_PUBLIC_FIREBASE_API_KEY and friends).',
    );
  }
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

export type AuthInfo = { email: string; password: string };

export function signup(info: AuthInfo) {
  return createUserWithEmailAndPassword(auth(), info.email, info.password);
}

export function login(info: AuthInfo) {
  return signInWithEmailAndPassword(auth(), info.email, info.password);
}

export function logout() {
  return firebaseConfigured ? signOut(auth()) : Promise.resolve();
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth(), email);
}
