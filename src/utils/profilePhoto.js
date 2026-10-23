import { supabase } from "../supabase";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

// Reuses the bucket your shelter logos already upload to.
const BUCKET = "shelter-assets";
const FOLDER = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const pathFromPublicUrl = (url) => {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
};

// Keeps the cached "user" object (read by the Navbar) in step with Firestore.
export function syncLocalUser(patch) {
  try {
    const local = JSON.parse(localStorage.getItem("user") || "null");
    if (!local) return;
    const changed = Object.keys(patch).some((k) => local[k] !== patch[k]);
    if (!changed) return;
    localStorage.setItem("user", JSON.stringify({ ...local, ...patch }));
    window.dispatchEvent(new Event("authChange"));
  } catch {
    /* ignore corrupt cache */
  }
}

// Uploads to Supabase, saves the URL on users/{uid}.photoURL, returns the URL.
export async function uploadProfilePhoto(file, uid, previousUrl) {
  if (!ALLOWED.includes(file.type)) throw new Error("Use a PNG, JPEG, WEBP or GIF image.");
  if (file.size > MAX_BYTES) throw new Error("Photo must be smaller than 5 MB.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${FOLDER}/${uid}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "3600" });
  if (error) throw error;

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  await setDoc(doc(db, "users", uid), { photoURL: url }, { merge: true });
  syncLocalUser({ photoURL: url });

  // Best-effort cleanup of this user's previous avatar only.
  const old = pathFromPublicUrl(previousUrl);
  if (old && old !== path && old.startsWith(`${FOLDER}/${uid}_`)) {
    await supabase.storage.from(BUCKET).remove([old]);
  }
  return url;
}