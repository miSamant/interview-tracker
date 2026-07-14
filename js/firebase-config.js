
import { GoogleAuthProvider, signInWithPopup } from "https://gstatic.com";
const loginBtn = document.getElementById('login-btn');
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfZb8LNHaI8UVvQFNAChwvRxyYrxC8At0",
  authDomain: "interview-tracker-58159.firebaseapp.com",
  projectId: "interview-tracker-58159",
  storageBucket: "interview-tracker-58159.firebasestorage.app",
  messagingSenderId: "545427084344",
  appId: "1:545427084344:web:7af340b8b2990a0d5e42cd",
  measurementId: "G-NRZW4L15QH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);