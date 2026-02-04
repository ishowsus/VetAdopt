import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDFoPMcXhwDaCIc6UIZAgTt6FF_zKpS0bE",
  authDomain: "vetadopt-3f512.firebaseapp.com",
  projectId: "vetadopt-3f512",
  storageBucket: "vetadopt-3f512.firebasestorage.app",
  messagingSenderId: "873923461446",
  appId: "1:873923461446:web:3cd59202a599ebf59b6547"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Added this
export const db = getFirestore(app); // Added this