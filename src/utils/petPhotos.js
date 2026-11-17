import { supabase } from "../supabase";
import { resizeImage } from "./chat";

// Same public bucket as profile photos; pet photos live under pets/.
const BUCKET = "shelter-assets";
export const PET_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PET_PHOTO_BYTES = 15 * 1024 * 1024; // raw file; it's shrunk before upload

export async function uploadPetPhoto(file, uid, index = 0) {
  if (!PET_PHOTO_TYPES.includes(file.type)) throw new Error("Use JPEG, PNG or WEBP photos.");
  if (file.size > MAX_PET_PHOTO_BYTES) throw new Error("A photo is too large (15 MB max).");
  const blob = await resizeImage(file);
  const path = `pets/${uid}_${Date.now()}_${index}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
