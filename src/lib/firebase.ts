import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrYcli7cOZGeCsZHumY19EkLckhDC2vd8",
  authDomain: "padelivo.firebaseapp.com",
  projectId: "padelivo",
  storageBucket: "padelivo.firebasestorage.app",
  messagingSenderId: "640319213717",
  appId: "1:640319213717:web:fb31160144de30d0bb8b9c",
  measurementId: "G-5TRQ04XPQE",
};

const app = initializeApp(firebaseConfig);

// Analytics can only be initialized in the browser (not during SSR)
let analytics: ReturnType<typeof getAnalytics> | undefined;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Firebase Analytics initialization failed:", e);
  }
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
