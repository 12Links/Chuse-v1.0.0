import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// User's private Firebase configurations with live fallback values and environments support
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyCusFPx0Rw-bx9jit603PY7DufNeSe4neA",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "choose-edec8.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "choose-edec8",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "choose-edec8.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "156699021666",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:156699021666:web:d99e6370f007f6ba29dc3b",
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);

const dbId = metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-33fcf38b-583c-4af0-8eff-4cc5bfc2fd4e";

export const db = dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, doc, setDoc, getDoc };
