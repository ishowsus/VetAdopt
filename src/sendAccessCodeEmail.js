import emailjs from "@emailjs/browser";

// Sends the user's 6-digit access code by email using EmailJS (free tier).
// Throws if EmailJS isn't configured or the send fails, so callers can fall
// back to showing the code on screen instead of locking the user out.
export async function sendAccessCodeEmail({ email, name, code }) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS is not configured (missing VITE_EMAILJS_* env vars).");
  }

  await emailjs.send(
    serviceId,
    templateId,
    { to_email: email, to_name: name || "there", access_code: code },
    { publicKey }
  );
}