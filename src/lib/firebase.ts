import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

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

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
