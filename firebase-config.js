// 1. Swap npm names with native production browser CDN paths
import { initializeApp } from "https://gstatic.com";
import { getAnalytics } from "https://gstatic.com";
import { getAuth } from "https://gstatic.com";
import { getFirestore } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyAfZb8LNHaI8UVvQFNAChwvRxyYrxC8At0",
  authDomain: "interview-tracker-58159.firebaseapp.com",
  projectId: "interview-tracker-58159",
  storageBucket: "interview-tracker-58159.firebasestorage.app",
  messagingSenderId: "545427084344",
  appId: "1:545427084344:web:7af340b8b2990a0d5e42cd",
  measurementId: "G-NRZW4L15QH"
};

// 2. Initialize your services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// 3. Export them globally so your other main script files can read them seamlessly
window.auth = auth;
window.db = db;
