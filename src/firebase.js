// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDBNsARgbis3cjvt4SZdnlmQ4vYhNcSRI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "stuff-18453.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "stuff-18453",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "stuff-18453.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "857850952387",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:857850952387:web:e3c94b7eafd031ff624076",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FMJ1X4EBCX",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
