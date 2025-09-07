import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCjebcEsTgfbTAD76EgZgymEA10tcUjIlg",
  authDomain: "agentic-meeting-studio.firebaseapp.com",
  projectId: "agentic-meeting-studio",
  storageBucket: "agentic-meeting-studio.firebasestorage.app",
  messagingSenderId: "631848199824",
  appId: "1:631848199824:web:a8be043e9863ab8ea81a15",
  measurementId: "G-TTM990Q3SQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (only in browser environment)
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export default app;