import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const config = {
  ...firebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (firebaseConfig.apiKey === 'VITE_FIREBASE_API_KEY_PLACEHOLDER' ? '' : firebaseConfig.apiKey)
};

if (!config.apiKey) {
  const errorMsg = "Firebase API Key is missing or invalid. Please add VITE_FIREBASE_API_KEY to your Secrets in the Settings menu.";
  console.error(errorMsg);
  // Optional: You could throw here, but we'll try to let initializing go as far as it can
}

const app = initializeApp(config);
export const db = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth();

import { doc, getDocFromServer } from 'firebase/firestore';
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connected successfully");
  } catch (error) {
    console.warn("Firestore connection check failed (this is expected if rules are strict):", error);
  }
}
testConnection();
