import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

// Random 6-digit number (100000–999999) using the browser's secure RNG.
const randomCode = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
};

/**
 * Reserves a unique 6-digit code for a user.
 *
 * Each code is stored as its own document: accessCodes/{code} -> { uid }.
 * Because the document ID *is* the code, Firestore guarantees no two users
 * can hold the same one. The transaction retries with a new number if the
 * one it picked is already taken.
 *
 * Must be called while the user is signed in (so Firestore rules allow it).
 */
export async function reserveUniqueAccessCode(uid, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = randomCode();
    const ref = doc(db, "accessCodes", code);
    const reserved = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false; // taken, try another
      tx.set(ref, { uid, createdAt: new Date().toISOString() });
      return true;
    });
    if (reserved) return code;
  }
  throw new Error("Could not generate a unique access code. Please try again.");
}