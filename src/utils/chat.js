import { useEffect, useState } from "react";
import { db } from "../firebase";
import { supabase } from "../supabase";
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

export const MAX_MESSAGE_LENGTH = 2000;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // raw file; it's shrunk before upload

// Chat photos go in the same public bucket as profile photos, under chat/.
const BUCKET = "shelter-assets";
const CHAT_FOLDER = "chat";
const MAX_IMAGE_EDGE = 1280;

// One conversation per pair of users. Sorting makes the id the same for both sides.
export const conversationIdFor = (a, b) => [a, b].sort().join("_");

/* ───────────── Images ───────────── */

// Shrinks a photo to at most 1280px on the long side and re-encodes it as JPEG.
export async function resizeImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // PNGs with transparency would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))), "image/jpeg", 0.82)
  );
}

async function uploadChatImage(file, convId, meId) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Use a JPEG, PNG or WEBP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("That image is too large (15 MB max).");
  const blob = await resizeImage(file);
  const path = `${CHAT_FOLDER}/${convId}/${Date.now()}_${meId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ───────────── Email alerts (EmailJS) ───────────── */

const EMAILJS = {
  serviceId: import.meta.env?.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env?.VITE_EMAILJS_CHAT_TEMPLATE_ID,
  publicKey: import.meta.env?.VITE_EMAILJS_PUBLIC_KEY,
};

// Best-effort: never blocks or breaks sending a message.
async function emailRecipient({ otherId, senderName, preview }) {
  if (!EMAILJS.serviceId || !EMAILJS.templateId || !EMAILJS.publicKey) return;
  try {
    const snap = await getDoc(doc(db, "users", otherId));
    const d = snap.exists() ? snap.data() : null;
    if (!d?.email || d.emailNotifications === false) return;
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS.serviceId,
        template_id: EMAILJS.templateId,
        user_id: EMAILJS.publicKey,
        template_params: {
          to_email: d.email,
          to_name: d.shelterName || d.name || "there",
          from_name: senderName,
          message_preview: preview,
          chat_link: `${window.location.origin}/messages`,
        },
      }),
    });
  } catch (err) {
    console.warn("Email alert not sent:", err);
  }
}

// Email on a brand-new conversation, then at most once an hour, and never while
// the other person is clearly active (they wrote in the last 15 minutes).
function shouldEmail(data, otherId) {
  if (!data) return true;
  const now = Date.now();
  const lastSent = data.updatedAt?.toMillis?.() ?? 0;
  const recipientActive = data.lastSenderId === otherId && now - lastSent < 15 * 60 * 1000;
  const lastEmail = data.lastEmailAt?.toMillis?.() ?? 0;
  return !recipientActive && now - lastEmail > 60 * 60 * 1000;
}

/* ───────────── Sending ───────────── */

/**
 * Sends a message (text and/or one photo), creating the conversation on the first one.
 * petContext: optional { id, name } so the thread shows which pet it's about.
 */
export async function sendMessage({ meId, otherId, text = "", imageFile = null, senderName = "Someone", petContext = null }) {
  const clean = text.trim();
  if (!clean && !imageFile) return;
  if (clean.length > MAX_MESSAGE_LENGTH) throw new Error("Message is too long.");

  const convId = conversationIdFor(meId, otherId);
  const convRef = doc(db, "conversations", convId);
  const snap = await getDoc(convRef); // rules allow reading a conversation that doesn't exist yet
  const data = snap.exists() ? snap.data() : null;

  const imageUrl = imageFile ? await uploadChatImage(imageFile, convId, meId) : null;
  const preview = clean ? (clean.length > 80 ? `${clean.slice(0, 80)}…` : clean) : "📷 Photo";
  const emailNow = shouldEmail(data, otherId);

  const batch = writeBatch(db);
  batch.set(doc(collection(convRef, "messages")), {
    senderId: meId,
    text: clean,
    ...(imageUrl ? { imageUrl } : {}),
    createdAt: serverTimestamp(),
  });

  if (!data) {
    batch.set(convRef, {
      participants: [meId, otherId].sort(),
      initiatorId: meId,
      ...(petContext ? { petContext } : {}),
      lastMessage: preview,
      lastSenderId: meId,
      updatedAt: serverTimestamp(),
      lastEmailAt: serverTimestamp(),
      unread: { [meId]: 0, [otherId]: 1 },
      blockedBy: [],
    });
    batch.set(doc(collection(db, "notifications")), {
      userId: otherId,
      text: `💬 ${senderName} sent you a message: "${preview}"`,
      type: "message",
      conversationId: convId,
      createdAt: serverTimestamp(),
      read: false,
    });
  } else {
    batch.update(convRef, {
      lastMessage: preview,
      lastSenderId: meId,
      updatedAt: serverTimestamp(),
      [`unread.${otherId}`]: increment(1),
      ...(emailNow ? { lastEmailAt: serverTimestamp() } : {}),
      ...(petContext ? { petContext } : {}),
    });
  }
  await batch.commit();

  if (emailNow) emailRecipient({ otherId, senderName, preview }); // fire and forget
}

/* ───────────── Application updates inside the chat ───────────── */

const APP_STATUS = {
  pending: "submitted",
  submitted: "submitted",
  approved: "approved",
  accepted: "approved",
  rejected: "rejected",
  declined: "rejected",
  info_requested: "info_requested",
};

export const normalizeApplicationStatus = (s) => APP_STATUS[String(s || "").trim().toLowerCase().replace(/\s+/g, "_")] || null;

/**
 * Posts a status line ("Application approved…") into the adopter ⇄ shelter thread.
 *  - Adopter submitting: call with status "Pending"/"submitted"  (creates the thread if needed)
 *  - Shelter deciding:   call with "Approved" / "Rejected" / "info_requested"
 * Pending statuses from the shelter side and unknown statuses are ignored.
 */
export async function postApplicationUpdate({ meId, otherId, petId, petName, status, note = "", senderName = "Someone" }) {
  const normalized = normalizeApplicationStatus(status);
  if (!normalized) return;

  const n = note.trim().slice(0, 300);
  const pet = petName || "this pet";
  const text = {
    submitted: `📋 Application submitted for ${pet}.`,
    approved: `✅ Application for ${pet} was approved.${n ? ` ${n}` : ""}`,
    rejected: `Application for ${pet} wasn't approved.${n ? ` Note: ${n}` : ""}`,
    info_requested: `ℹ️ More information requested for ${pet}.${n ? ` ${n}` : ""}`,
  }[normalized];

  const convId = conversationIdFor(meId, otherId);
  const convRef = doc(db, "conversations", convId);
  const snap = await getDoc(convRef);

  const batch = writeBatch(db);
  batch.set(doc(collection(convRef, "messages")), {
    senderId: meId,
    text,
    type: "application",
    status: normalized,
    ...(petId ? { petId } : {}),
    createdAt: serverTimestamp(),
  });

  if (!snap.exists()) {
    batch.set(convRef, {
      participants: [meId, otherId].sort(),
      initiatorId: meId,
      ...(petId ? { petContext: { id: petId, name: pet } } : {}),
      lastMessage: text,
      lastSenderId: meId,
      updatedAt: serverTimestamp(),
      unread: { [meId]: 0, [otherId]: 1 },
      blockedBy: [],
    });
  } else {
    batch.update(convRef, {
      lastMessage: text,
      lastSenderId: meId,
      updatedAt: serverTimestamp(),
      [`unread.${otherId}`]: increment(1),
      ...(petId ? { petContext: { id: petId, name: pet } } : {}),
    });
  }
  await batch.commit();
}

/* ───────────── Reading ───────────── */

export async function markRead(convId, meId) {
  await updateDoc(doc(db, "conversations", convId), { [`unread.${meId}`]: 0 });
}

// Total unread messages for a user. Use it for a badge in the Navbar / dashboards.
export function useUnreadCount(uid) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!uid) {
      setCount(0);
      return undefined;
    }
    const q = query(collection(db, "conversations"), where("participants", "array-contains", uid));
    return onSnapshot(
      q,
      (snap) => setCount(snap.docs.reduce((sum, d) => sum + (d.data().unread?.[uid] || 0), 0)),
      () => setCount(0)
    );
  }, [uid]);
  return count;
}