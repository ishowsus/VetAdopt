// FILE: src/components/RoleGuide.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useVerification } from "./shared/VerificationPanel";

/*
 * A short welcome tour, different for each role, shown once to new users.
 * Mounted once in App.jsx: <RoleGuide user={user} />
 * It can be reopened any time with: window.dispatchEvent(new Event("openGuide"))
 */

const GUIDES = {
  adopter: {
    title: "Welcome to VetAdopt! 🐾",
    steps: [
      ["🐶", "Find your pet", "Browse available pets on the Adopt page. Filter by type, age and gender, and tap the heart to add pets to your favorites.", "/adopt"],
      ["💬", "Talk to shelters", "Message a shelter or a pet's owner, and book a visit to meet a pet in person before you decide.", "/adopt"],
      ["📋", "Apply to adopt", "Verify your email, answer a few questions about your home and routine, and send your application. Follow your visits in Profile, then My bookings.", "/profile?tab=bookings"],
      ["✅", "Get verified", "Add your ID under Profile, then Verification, so shelters know they can trust you.", "/profile?tab=verification"],
      ["🩺", "Care and rehome", "Read the Pet Care guide, find a vet on the map, or rehome a pet you can't keep.", "/pet-care"],
    ],
  },
  veterinarian: {
    title: "Welcome, doctor! 🩺",
    steps: [
      ["✅", "Your verified badge", "An admin reviews your license. Once approved, a verified badge shows next to your clinic on the vet map.", "/vet/profile"],
      ["🗓️", "Set your availability", "Add your weekly hours in your profile so adopters can book you.", "/vet/profile"],
      ["📅", "Answer appointments", "Confirm or decline booking requests as they come in.", "/vet/appointments"],
      ["📋", "Keep medical records", "Record visits and treatments for your patients.", "/vet/medical-records"],
      ["💬", "Reply to messages", "Adopters can message your clinic. You'll get a notification each time.", "/vet/messages"],
    ],
  },
  shelter: {
    title: "Welcome to VetAdopt! 🏠",
    steps: [
      ["📍", "Complete your profile", "Add your address and set your map pin so adopters can find and visit you.", "/shelter/profile"],
      ["🐕", "Add your pets", "List the animals you have, with clear photos and details.", "/shelter/pets"],
      ["📅", "Set visiting hours", "Choose when adopters can visit. After each visit, tell them if it's a match.", "/shelter/profile"],
      ["📋", "Review applications", "See each applicant's answers at a glance, then approve or ask for more information.", "/shelter/adoption-requests"],
      ["💚", "Confirm donations", "Check your e-wallet and confirm donations so donors get their receipts.", "/shelter/donations"],
    ],
  },
  admin: {
    title: "Welcome, admin 🛡️",
    steps: [
      ["🛡️", "Verification requests", "Approve or decline vet licenses, shelter papers and adopter IDs.", "/admin/verifications"],
      ["🐾", "Pet listings", "Review pets that adopters want to rehome before they go live.", "/admin/listings"],
      ["👥", "Users", "See and manage everyone on the platform.", "/admin/users"],
      ["🚩", "Reports", "Look into reports from users.", "/admin/reports"],
    ],
  },
};

const roleKey = (r) => {
  const x = String(r || "").toLowerCase();
  if (x === "vet") return "veterinarian";
  return GUIDES[x] ? x : null;
};

export default function RoleGuide({ user }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [uid, setUid] = useState(null);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const checked = useRef("");
  const key = roleKey(user?.role);
  const { data: verification } = useVerification(key === "veterinarian" ? uid : null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid || null)), []);

  // Show it once to people who haven't seen it. Vets see it after they submit their license.
  const vetReady = key !== "veterinarian" || ["pending", "verified"].includes(verification?.status);
  useEffect(() => {
    if (!uid || !key || !vetReady || checked.current === uid) return;
    checked.current = uid;
    (async () => {
      try {
        if (localStorage.getItem(`guideSeen_${uid}`)) return;
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists() && snap.data().guideSeen === true) return;
        setI(0);
        setOpen(true);
      } catch {
        /* if we can't tell, don't nag */
      }
    })();
  }, [uid, key, vetReady]);

  useEffect(() => {
    const reopen = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener("openGuide", reopen);
    return () => window.removeEventListener("openGuide", reopen);
  }, []);

  const finish = () => {
    setOpen(false);
    if (!uid) return;
    try {
      localStorage.setItem(`guideSeen_${uid}`, "1");
    } catch {
      /* storage unavailable */
    }
    setDoc(doc(db, "users", uid), { guideSeen: true }, { merge: true }).catch(() => {});
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uid]);

  const guide = key && GUIDES[key];
  if (!open || !guide || pathname === "/login" || pathname === "/register") return null;
  const [icon, title, text, path] = guide.steps[i];
  const last = i === guide.steps.length - 1;

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label={guide.title}>
      <div style={s.card}>
        <button type="button" onClick={finish} aria-label="Close the guide" style={s.x}>✕</button>
        <p style={s.kicker}>{guide.title}</p>
        <div style={s.icon} aria-hidden="true">{icon}</div>
        <h2 style={s.h2}>{title}</h2>
        <p style={s.text}>{text}</p>
        {path && (
          <button type="button" style={s.try} onClick={() => { finish(); navigate(path); }}>
            Take me there
          </button>
        )}

        <div style={s.dots} aria-hidden="true">
          {guide.steps.map((_, n) => (
            <span key={n} style={{ ...s.dot, ...(n === i ? s.dotOn : {}) }} />
          ))}
        </div>
        <p style={s.count}>Step {i + 1} of {guide.steps.length}</p>

        <div style={s.row}>
          <button type="button" style={s.ghost} onClick={finish}>Skip</button>
          <div style={{ display: "flex", gap: 8 }}>
            {i > 0 && <button type="button" style={s.secondary} onClick={() => setI(i - 1)}>Back</button>}
            <button type="button" style={s.primary} onClick={() => (last ? finish() : setI(i + 1))}>{last ? "Got it" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(15,23,42,.6)" },
  card: { position: "relative", width: "100%", maxWidth: 430, padding: "28px 26px 22px", background: "#fff", borderRadius: 22, boxShadow: "0 24px 60px rgba(0,0,0,.35)", textAlign: "center", color: "#0f172a" },
  x: { position: "absolute", top: 12, right: 14, border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#64748b" },
  kicker: { margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#0d6b6e", textTransform: "uppercase", letterSpacing: ".05em" },
  icon: { fontSize: 52, margin: "6px 0" },
  h2: { margin: "0 0 8px", fontSize: "1.35rem" },
  text: { margin: "0 0 14px", color: "#475569", lineHeight: 1.55 },
  try: { padding: "8px 18px", border: "2px solid #0d6b6e", borderRadius: 999, background: "#fff", color: "#0d6b6e", fontWeight: 700, cursor: "pointer" },
  dots: { display: "flex", justifyContent: "center", gap: 6, margin: "18px 0 4px" },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#cbd5e1" },
  dotOn: { background: "#0d6b6e", width: 22, borderRadius: 4 },
  count: { margin: "0 0 14px", fontSize: 12, color: "#94a3b8" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  ghost: { border: "none", background: "none", color: "#64748b", cursor: "pointer", padding: "8px 4px", fontWeight: 600 },
  secondary: { padding: "9px 18px", border: "2px solid #0d6b6e", borderRadius: 10, background: "#fff", color: "#0d6b6e", fontWeight: 700, cursor: "pointer" },
  primary: { padding: "9px 22px", border: "none", borderRadius: 10, background: "#0d6b6e", color: "#fff", fontWeight: 700, cursor: "pointer" },
};