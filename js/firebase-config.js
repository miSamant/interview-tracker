
import { initializeApp } from "https://www.gstatic.com";
import { getAnalytics } from "https://www.gstatic.com";
import { getAuth } from "https://www.gstatic.com";
import { getFirestore } from "https://www.gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyAfZb8LNHaI8UVvQFNAChwvRxyYrxC8At0",
  authDomain: "interview-tracker-58159.firebaseapp.com",
  projectId: "interview-tracker-58159",
  storageBucket: "interview-tracker-58159.firebasestorage.app",
  messagingSenderId: "545427084344",
  appId: "1:545427084344:web:7af340b8b2990a0d5e42cd",
  measurementId: "G-NRZW4L15QH"
};

// Initialize your services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Share them with your login scripts globally
window.auth = auth;
window.db = db;
