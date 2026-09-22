// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDFoPMcXhwDaCIc6UIZAgTt6FF_zKpS0bE",
  authDomain: "vetadopt-3f512.firebaseapp.com",
  projectId: "vetadopt-3f512",
  storageBucket: "vetadopt-3f512.firebasestorage.app",
  messagingSenderId: "873923461446",
  appId: "1:873923461446:web:3cd59202a599ebf59b6547"
};

const app = initializeApp(firebaseConfig);

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
