<<<<<<< HEAD
// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

=======
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // ← add this
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
const firebaseConfig = {
  apiKey: "AIzaSyDFoPMcXhwDaCIc6UIZAgTt6FF_zKpS0bE",
  authDomain: "vetadopt-3f512.firebaseapp.com",
  projectId: "vetadopt-3f512",
  storageBucket: "vetadopt-3f512.firebasestorage.app",
  messagingSenderId: "873923461446",
  appId: "1:873923461446:web:3cd59202a599ebf59b6547"
};

const app = initializeApp(firebaseConfig);
<<<<<<< HEAD

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper to track online/offline presence in Firestore
export const updateUserPresence = async (uid, isOnline) => {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      isOnline,
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating presence:", error);
  }
};
=======
export const auth = getAuth(app); // Added this
export const db = getFirestore(app); // Added this
export const storage = getStorage(app);  // ← add this
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
