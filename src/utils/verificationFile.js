import { db } from "../firebase";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

/*
 * Stores a verification photo (ID, license, registration) inside Firestore instead of
 * Firebase Storage, which now needs a paid plan. The photo is shrunk to a small JPEG and
 * kept in verificationFiles/{uid}, which only that user and admins can read (see the rules).
 */

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const TOTAL_CHARS = 850000; // shared by all photos: a Firestore document can't exceed 1 MiB
export const MAX_VERIFICATION_FILES = 3;
const ATTEMPTS = [[1600, 0.78], [1400, 0.7], [1200, 0.65], [1000, 0.6], [800, 0.55], [640, 0.5]];

async function toDataUrl(file, budget) {
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
    if (url.length <= budget) {
      bitmap.close?.();
      return url;
    }
  }
  bitmap.close?.();
  throw new Error("That photo is too detailed to store. Try a clearer, smaller photo.");
}

// Used as the uploadFile function of VerificationPanel: (file or [files], uid) => path label.
export async function saveVerificationFile(input, uid) {
  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0 || list.length > MAX_VERIFICATION_FILES) throw new Error(`Add between 1 and ${MAX_VERIFICATION_FILES} photos.`);
  if (list.some((f) => !TYPES.includes(f.type))) throw new Error("Use JPEG, PNG or WEBP photos.");
  const budget = Math.floor(TOTAL_CHARS / list.length);
  const files = [];
  for (const f of list) files.push({ name: String(f.name || "photo").slice(0, 80), dataUrl: await toDataUrl(f, budget) });
  await setDoc(doc(db, "verificationFiles", uid), { ownerId: uid, files, createdAt: serverTimestamp() });
  return `verificationDocs/${uid}/inline`; // a label; the real files are in the Firestore document
}

// Admin side: [{ name, url }], keeping only plain JPEG data URLs.
export async function loadVerificationFiles(uid) {
  const snap = await getDoc(doc(db, "verificationFiles", uid));
  if (!snap.exists()) return [];
  const d = snap.data();
  const files = Array.isArray(d.files) ? d.files : d.dataUrl ? [{ name: d.name, dataUrl: d.dataUrl }] : [];
  return files
    .filter((f) => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f?.dataUrl || ""))
    .map((f) => ({ name: f.name || "photo", url: f.dataUrl }));
}

export const loadVerificationFile = async (uid) => (await loadVerificationFiles(uid))[0]?.url || "";

export const deleteVerificationFile = (uid) => deleteDoc(doc(db, "verificationFiles", uid));

// For opening full size in a new tab. Forces the image type so it can never run as a page.
export function dataUrlToBlobUrl(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
}