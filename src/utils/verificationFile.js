import { db } from "../firebase";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

/*
 * Stores a verification photo (ID, license, registration) inside Firestore instead of
 * Firebase Storage, which now needs a paid plan. The photo is shrunk to a small JPEG and
 * kept in verificationFiles/{uid}, which only that user and admins can read (see the rules).
 */

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_CHARS = 700000; // a Firestore document can't exceed 1 MiB
const ATTEMPTS = [[1600, 0.78], [1400, 0.7], [1200, 0.65], [1000, 0.6], [800, 0.55], [640, 0.5]];

async function toDataUrl(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  for (const [edge, quality] of ATTEMPTS) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_CHARS) {
      bitmap.close?.();
      return url;
    }
  }
  bitmap.close?.();
  throw new Error("That photo is too detailed to store. Try a clearer, smaller photo.");
}

// Used as the uploadFile function of VerificationPanel: (file, uid) => path string.
export async function saveVerificationFile(file, uid) {
  if (!TYPES.includes(file.type)) throw new Error("Use a JPEG, PNG or WEBP photo.");
  const dataUrl = await toDataUrl(file);
  await setDoc(doc(db, "verificationFiles", uid), {
    ownerId: uid,
    name: String(file.name || "photo").slice(0, 80),
    dataUrl,
    createdAt: serverTimestamp(),
  });
  return `verificationDocs/${uid}/inline`; // a label; the real file is the Firestore document
}

// Admin side. Returns "" unless the stored value is a plain JPEG data URL.
export async function loadVerificationFile(uid) {
  const snap = await getDoc(doc(db, "verificationFiles", uid));
  const url = snap.exists() ? snap.data().dataUrl : "";
  return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(url || "") ? url : "";
}

export const deleteVerificationFile = (uid) => deleteDoc(doc(db, "verificationFiles", uid));

// For opening full size in a new tab. Forces the image type so it can never run as a page.
export function dataUrlToBlobUrl(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
}