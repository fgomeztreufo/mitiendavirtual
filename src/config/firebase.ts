import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "tu-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tu-proyecto.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tu-proyecto-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tu-proyecto.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "tu-app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isMessagingSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}