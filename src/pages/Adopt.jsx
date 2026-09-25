import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

const PAGE_SIZE = 9;

const TYPE_ICONS = { All: "🐾", Dog: "🐶", Cat: "🐱", Rabbit: "🐰", Parrot: "🦜", Bird: "🦜" };
const BADGE_COLORS = {
  Available: { bg: "#e8f5e9", text: "#2e7d32" },
  Pending: { bg: "#fff8e1", text: "#f57f17" },
  Adopted: { bg: "#f1f5f9", text: "#475569" },
  New: { bg: "#e8f5e9", text: "#2e7d32" },
  Puppy: { bg: "#fff8e1", text: "#f57f17" },
  Kitten: { bg: "#fff8e1", text: "#f57f17" },
};

const DEFAULT_PET_IMAGE =
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80";

// Maps free-text age labels to filter buckets so non-numeric ages
// ("Puppy", "Young", "Senior", ...) don't fall through to Baby.
const AGE_LABELS = {
  puppy: "Baby",
  kitten: "Baby",
  baby: "Baby",
  young: "Young",
  adult: "Adult",
  senior: "Senior",
};

const getPetImgUrl = (pet) =>
  pet?.photoUrl || pet?.image || pet?.photo || pet?.imageUrl || "";
const badgeStyle = (text) => ({
  background: BADGE_COLORS[text]?.bg || "#e8f5e9",
  color: BADGE_COLORS[text]?.text || "#2e7d32",
});

// Returns months, or null when the string isn't a parseable age.
const months = (ageStr) => {
  if (!ageStr) return null;
  const s = String(ageStr).toLowerCase();
  const n = parseInt(s, 10);
  if (isNaN(n)) return null;
  if (s.includes("year") || s.includes("yr")) return n * 12;
  return n; // "N months" / bare number
};

// Firestore Timestamp, plain {seconds,...}, or the ISO string your posting
// form writes — normalized to millis so "newest first" can sort client-side
// without needing a Firestore orderBy (and the composite index that requires).
const createdAtMillis = (pet) => {
  const c = pet?.createdAt;
  if (!c) return 0;
  if (typeof c === "string") {
    const t = Date.parse(c);
    return isNaN(t) ? 0 : t;
  }
  if (typeof c.toDate === "function") return c.toDate().getTime();
  if (typeof c.seconds === "number") return c.seconds * 1000;
  return 0;
};

const ageBucket = (pet) => {
  const label = AGE_LABELS[String(pet?.age || "").toLowerCase().trim()];
  if (label) return label;
  const m = months(pet?.age);
  if (m === null) return null;
  if (m <= 6) return "Baby";
  if (m <= 24) return "Young";
  if (m <= 84) return "Adult";
  return "Senior";
};

const EmbeddedStyles = () => (
  <style>{`
    .adopt-root {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a202c;
      box-sizing: border-box;
    }
    .adopt-root * { box-sizing: border-box; }
    .ad-hero {
      text-align: center;
      margin-bottom: 32px;
      padding: 40px 20px;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-radius: 16px;
      border: 1px solid #bbf7d0;
    }
    .ad-hero h1 { font-size: 2.25rem; margin: 0 0 10px 0; color: #14532d; }
    .ad-hero h1 em { font-style: normal; color: #16a34a; }
    .ad-hero p { color: #4b5563; margin: 0 0 24px 0; font-size: 1rem; }
    .ad-hero-stats { display: flex; justify-content: center; gap: 40px; }
    .ad-stat-num { font-size: 1.75rem; font-weight: 800; color: #15803d; }
    .ad-stat-label { font-size: 0.85rem; color: #4b5563; font-weight: 500; }
    .ad-layout { display: grid; grid-template-columns: 260px 1fr; gap: 32px; }
    @media (max-width: 850px) { .ad-layout { grid-template-columns: 1fr; } }
    .ad-sidebar { display: flex; flex-direction: column; gap: 20px; }
    .side-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .side-card h3 { font-size: 1.1rem; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
    .side-card h4 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 16px 0 8px 0; }
    .sidebar-filter {
      display: flex; justify-content: space-between; align-items: center;
      width: 100%; text-align: left; padding: 10px 14px; margin-bottom: 6px;
      border: 1px solid transparent; background: #f8fafc; border-radius: 8px; cursor: pointer;
      font-weight: 500; color: #334155; transition: all 0.2s ease;
    }
    .sidebar-filter.active, .sidebar-filter:hover { background: #dcfce7; color: #14532d; border-color: #86efac; }
    .sidebar-count { font-size: 0.75rem; color: #64748b; font-variant-numeric: tabular-nums; }
    .reset-btn {
      width: 100%; margin-top: 16px; padding: 10px; background: none; border: 1px dashed #cbd5e1;
      border-radius: 8px; cursor: pointer; color: #64748b; font-weight: 600;
    }
    .reset-btn:hover { background: #f1f5f9; color: #0f172a; }
    .ad-controls { display: flex; gap: 16px; margin-bottom: 24px; }
    .ad-search-wrap { position: relative; flex: 1; }
    .ad-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); }
    .ad-search { width: 100%; padding: 12px 14px 12px 40px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; outline: none; }
    .ad-search:focus { border-color: #16a34a; }
    .ad-sort { padding: 0 16px; border: 1px solid #cbd5e1; border-radius: 10px; background: white; font-size: 0.9rem; outline: none; cursor: pointer; }
    .ad-category-section { margin-bottom: 40px; }
    .ad-category-title {
      font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px;
    }
    .ad-category-count { font-size: 0.9rem; font-weight: 500; color: #64748b; }
    .ad-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; }

    /* ---------- Skeleton loading ---------- */
    .sk-card { border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    .sk-img { aspect-ratio: 5 / 6; background: #f1f5f9; }
    .sk-line { height: 12px; border-radius: 6px; background: #f1f5f9; margin: 14px 16px; }
    .sk-line.short { width: 45%; }
    .ad-pulse { animation: ad-pulse 1.2s ease-in-out infinite; }
    @keyframes ad-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .ad-loadmore {
      display: block; margin: 8px auto 32px auto; padding: 12px 28px;
      border: 1px solid #cbd5e1; border-radius: 10px; background: #fff;
      color: #334155; font-weight: 600; cursor: pointer;
    }
    .ad-loadmore:hover:not(:disabled) { border-color: #16a34a; color: #14532d; }
    .ad-loadmore:disabled { opacity: 0.6; cursor: wait; }

    /* ---------- Expandable pet card ---------- */
    .pc2-card {
      position: relative;
      aspect-ratio: 5 / 6;
      cursor: pointer;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
      background: #0f172a;
    }
    .pc2-card:focus-visible { outline: 3px solid #16a34a; outline-offset: 2px; }
    .pc2-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .pc2-shade {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.15) 55%, transparent);
    }
    .pc2-badge {
      position: absolute; top: 12px; right: 12px; z-index: 2;
      padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
    }
    .pc2-info { position: absolute; left: 0; bottom: 0; width: 100%; padding: 20px; color: #fff; z-index: 2; }
    .pc2-sub { margin: 0 0 4px; font-size: 0.8rem; font-weight: 500; color: #86efac; }
    .pc2-name { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .pc2-hint { margin: 6px 0 0; font-size: 0.75rem; color: rgba(255,255,255,0.7); }

    .pc2-overlay { position: fixed; inset: 0; z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .pc2-backdrop { position: absolute; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(6px); }
    .pc2-open {
      position: relative; z-index: 1; width: 100%; max-width: 940px; height: 84vh; max-height: 680px;
      border-radius: 20px; background: #fff; overflow: hidden; display: flex; flex-direction: row;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
    }
    .pc2-open-img { position: relative; width: 40%; flex-shrink: 0; overflow: hidden; }
    .pc2-open-body { width: 60%; padding: 28px 32px 20px 32px; display: flex; flex-direction: column; overflow-y: auto; }
    .pc2-open-body .pc2-sub { color: #15803d; }
    .pc2-open-name { margin: 0 0 16px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; font-size: 1.8rem; color: #0f172a; }
    .pc2-close {
      position: absolute; top: 14px; right: 14px; z-index: 5; width: 34px; height: 34px;
      border-radius: 50%; border: 1px solid #e2e8f0; background: rgba(255,255,255,0.9);
      cursor: pointer; font-size: 0.9rem;
    }
    .pc2-close:hover { background: #f1f5f9; }
    .pc2-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 0 16px; }
    .pc2-details dt { font-size: 0.75rem; color: #64748b; margin-bottom: 2px; }
    .pc2-details dd { margin: 0; font-size: 0.95rem; font-weight: 600; color: #0f172a; }
    .pc2-desc { font-size: 0.925rem; line-height: 1.55; color: #475569; margin: 0 0 12px; }
    .pc2-poster { font-size: 0.85rem; font-weight: 600; color: #15803d; margin: 0 0 14px; }
    .pc2-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .pc2-tag { background: #f1f5f9; color: #475569; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; }
    .pc2-adopt {
      margin-top: auto; padding: 14px; width: 100%; background: #15803d; color: #fff; border: none;
      border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer;
    }
    .pc2-adopt:hover:not(:disabled) { background: #166534; }
    .pc2-adopt:disabled { background: #cbd5e1; cursor: not-allowed; }

    /* ---------- Inline form inside the expanded card ---------- */
    .pc2-form-title { font-size: 1.05rem; font-weight: 700; color: #0f172a; margin: 4px 0 12px 0; }
    .ad-field { margin-bottom: 12px; }
    .ad-field .ad-label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: #334155; }
    .ad-err { display: none; color: #dc2626; font-size: 0.78rem; margin-top: 4px; }
    .ad-field.bad .ad-err { display: block; }
    .ad-field.bad .ad-input { border-color: #dc2626; }
    .ad-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pc2-foot { margin-top: auto; padding-top: 14px; position: sticky; bottom: 0; background: #fff; }
    .ad-note {
      font-size: 0.85rem; padding: 10px 12px; border-radius: 8px; margin-bottom: 14px;
      background: #fff8e1; color: #92400e; border: 1px solid #fde68a;
    }
    .ad-success { text-align: center; padding: 48px 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: center; }
    .ad-success-icon { font-size: 3rem; }
    .ad-success h2 { margin: 0; color: #0f172a; }
    .ad-success p { color: #64748b; font-size: 0.95rem; max-width: 380px; margin: 0 0 16px; }

    @media (max-width: 700px) {
      .pc2-open { flex-direction: column; height: 92vh; max-height: none; }
      .pc2-open-img { width: 100%; height: 200px; }
      .pc2-open-body { width: 100%; padding: 20px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pc2-card, .pc2-open { transition: none; }
    }

    /* ---------- Auth modal ---------- */
    .ad-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
    .ad-modal { background: white; border-radius: 16px; max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 28px; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .ad-modal-close { position: absolute; top: 20px; right: 20px; border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .ad-modal h2 { margin-top: 0; margin-bottom: 4px; color: #0f172a; }
    .ad-modal-sub { color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }
    .ad-input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; outline: none; }
    .ad-input:focus { border-color: #16a34a; }
    .ad-submit-btn { width: 100%; padding: 14px; background: #15803d; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; margin-top: 8px; }
    .ad-submit-btn:hover:not(:disabled) { background: #166534; }
    .ad-submit-btn:disabled { opacity: 0.6; cursor: wait; }
    .ad-switch { text-align: center; margin-top: 16px; font-size: 0.85rem; color: #64748b; }
    .ad-switch span { color: #15803d; font-weight: 600; cursor: pointer; text-decoration: underline; }
    .ad-error { color: #dc2626; background: #fef2f2; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; margin-top: 10px; }
    .ad-empty { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; }
  `}</style>
);

/* ---------- Small behavior hooks ---------- */

function usePetImage(pet) {
  const raw = getPetImgUrl(pet);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [raw]);
  return {
    src: !failed && raw ? raw : DEFAULT_PET_IMAGE,
    onError: () => setFailed(true),
  };
}

function useLockBody(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const previous = document.activeElement;
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(container.querySelectorAll(selector)).filter((n) => !n.disabled);

    focusables()[0]?.focus();

    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [ref, active]);
}

/* ---------- Collapsed pet card ---------- */

function PetCard({ pet, onExpand, index }) {
  const img = usePetImage(pet);
  const badge = pet.badge || pet.status || "Available";

  return (
    <motion.button
      type="button"
      className="pc2-card"
      onClick={() => onExpand(pet)}
      aria-label={`View details for ${pet.name}`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, delay: (index % 9) * 0.04, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
    >
      <img className="pc2-img" src={img.src} alt={pet.name || "Pet"} onError={img.onError} />
      <div className="pc2-shade" />
      <span className="pc2-badge" style={badgeStyle(badge)}>{badge}</span>
      <div className="pc2-info">
        <p className="pc2-sub">
          {[pet.breed || pet.type, pet.age].filter(Boolean).join(", ")}
        </p>
        <h3 className="pc2-name">{pet.name}</h3>
        <p className="pc2-hint">Tap for details</p>
      </div>
    </motion.button>
  );
}

/* ---------- Expanded panel: details + adoption form in one surface ---------- */

const EMPTY_CONTACT = {
  fullName: "",
  age: "",
  phone: "",
  reason: "",
};

function ExpandedPetPanel({ pet, user, applied, authVersion, onClose, onRequireAuth, onSubmit }) {
  const [step, setStep] = useState("details"); // details | form | success
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const img = usePetImage(pet);
  const badge = pet.badge || pet.status || "Available";
  const panelRef = useRef(null);

  useLockBody(true);
  useEscape(onClose);
  useFocusTrap(panelRef, true);

  // If the user just finished logging in from the auth modal, advance to the form.
  useEffect(() => {
    if (authVersion > 0 && step === "details") setStep("form");
  }, [authVersion, step]);

  const alreadyApplied = applied.has(pet.id);

  const startApplication = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setStep("form");
  };

  const validate = () => {
    const errs = {};
    if (!contact.fullName.trim()) errs.fullName = "Name is required.";
    const age = parseInt(contact.age, 10);
    if (isNaN(age) || age < 18) errs.age = "You must be 18 or older to adopt.";
    if (!/^[\d+\-()\s]{7,}$/.test(contact.phone.trim()))
      errs.phone = "Enter a valid phone number.";
    if (contact.reason.trim().length < 10)
      errs.reason = "Tell us a little more (at least 10 characters).";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    setSubmitError("");
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(pet, contact);
      setStep("success");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label, input) => (
    <div className={`ad-field ${errors[key] ? "bad" : ""}`}>
      <label className="ad-label">{label}</label>
      {input}
      <p className="ad-err">{errors[key]}</p>
    </div>
  );

  return (
    <div className="pc2-overlay">
      <motion.div
        className="pc2-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        className="pc2-open"
        role="dialog"
        aria-modal="true"
        aria-label={pet.name}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <button className="pc2-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="pc2-open-img">
          <img className="pc2-img" src={img.src} alt={pet.name || "Pet"} onError={img.onError} />
          <span className="pc2-badge" style={badgeStyle(badge)}>{badge}</span>
        </div>

        <div className="pc2-open-body">
          {step === "success" ? (
            <div className="ad-success">
              <span className="ad-success-icon">🎉</span>
              <h2>Application submitted</h2>
              <p>
                Thanks{contact.fullName ? `, ${contact.fullName.split(" ")[0]}` : ""} — the
                {pet.postedByRole === "shelter" ? " shelter" : " owner"} will review your
                request for {pet.name} and you'll be notified here.
              </p>
              <button className="ad-submit-btn" style={{ maxWidth: 220 }} onClick={onClose}>
                Browse more pets
              </button>
            </div>
          ) : (
            <>
              <p className="pc2-sub">
                {[pet.breed || pet.type, pet.gender, pet.age].filter(Boolean).join(" · ")}
              </p>
              <h3 className="pc2-open-name">{pet.name}</h3>

              <dl className="pc2-details">
                <div><dt>Species</dt><dd>{pet.type || "—"}</dd></div>
                <div><dt>Age group</dt><dd>{ageBucket(pet) || "—"}</dd></div>
                <div><dt>Gender</dt><dd>{pet.gender || "—"}</dd></div>
                <div><dt>Breed</dt><dd>{pet.breed || "—"}</dd></div>
              </dl>

              <p className="pc2-poster">
                Posted by {pet.postedByRole === "shelter" ? "a verified shelter" : "a pet owner"}
              </p>

              <p className="pc2-desc">{pet.description || "Looking for a loving home!"}</p>

              {pet.tags?.length > 0 && (
                <div className="pc2-tags">
                  {pet.tags.map((t, i) => <span key={i} className="pc2-tag">{t}</span>)}
                </div>
              )}

              {step === "details" && (
                <>
                  {alreadyApplied && (
                    <div className="ad-note">
                      You've already applied for {pet.name}. We'll notify you when your
                      application is reviewed.
                    </div>
                  )}
                  <button
                    className="pc2-adopt"
                    onClick={startApplication}
                    disabled={alreadyApplied || pet.status === "Adopted"}
                  >
                    {alreadyApplied
                      ? "Application submitted"
                      : pet.status === "Adopted"
                      ? "Adopted"
                      : user
                      ? `Start application for ${pet.name}`
                      : "Log in to apply"}
                  </button>
                </>
              )}

              {step === "form" && (
                <>
                  {alreadyApplied && (
                    <div className="ad-note">
                      You've already applied for {pet.name} — submitting again won't speed
                      things up.
                    </div>
                  )}
                  <h4 className="pc2-form-title">Adoption application</h4>

                  {field(
                    "fullName",
                    "Your name",
                    <input
                      className="ad-input"
                      placeholder="Juan Dela Cruz"
                      value={contact.fullName}
                      onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                    />
                  )}

                  <div className="ad-form-2col">
                    {field(
                      "age",
                      "Age",
                      <input
                        className="ad-input"
                        type="number"
                        min="18"
                        placeholder="25"
                        value={contact.age}
                        onChange={(e) => setContact({ ...contact, age: e.target.value })}
                      />
                    )}
                    {field(
                      "phone",
                      "Phone",
                      <input
                        className="ad-input"
                        type="tel"
                        placeholder="+63 900 000 0000"
                        value={contact.phone}
                        onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                      />
                    )}
                  </div>

                  {field(
                    "reason",
                    `Why do you want to adopt ${pet.name}?`,
                    <textarea
                      className="ad-input"
                      rows={3}
                      placeholder="A sentence or two helps shelters review faster."
                      value={contact.reason}
                      onChange={(e) => setContact({ ...contact, reason: e.target.value })}
                    />
                  )}

                  {submitError && <p className="ad-error">⚠️ {submitError}</p>}

                  <div className="pc2-foot">
                    <button
                      className="pc2-adopt"
                      onClick={handleSubmit}
                      disabled={submitting || alreadyApplied}
                    >
                      {submitting
                        ? "Submitting…"
                        : alreadyApplied
                        ? "Application already submitted"
                        : "Submit application"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Auth modal (only used when applying while logged out) ---------- */

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const modalRef = useRef(null);

  useLockBody(true);
  useEscape(onClose);
  useFocusTrap(modalRef, true);

  const handleAuth = async () => {
    if (!authData.email || !authData.password) {
      setAuthError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setAuthError("");
    try {
      if (mode === "register") {
        if (!authData.name.trim()) {
          setAuthError("Full name is required.");
          setLoading(false);
          return;
        }
        const res = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
        await updateProfile(res.user, { displayName: authData.name });
      } else {
        await signInWithEmailAndPassword(auth, authData.email, authData.password);
      }
      onSuccess();
    } catch (err) {
      setAuthError(
        err.code === "auth/wrong-password"
          ? "Incorrect password."
          : err.code === "auth/user-not-found"
          ? "No account found with this email."
          : err.code === "auth/email-already-in-use"
          ? "An account already exists with this email."
          : err.message
      );
      setLoading(false);
    }
  };

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button className="ad-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <h2>{mode === "login" ? "Welcome back 👋" : "Create account 🐾"}</h2>
        <p className="ad-modal-sub">
          {mode === "login"
            ? "Log in to continue your adoption application."
            : "Register to file your official adoption request."}
        </p>

        {mode === "register" && (
          <>
            <label className="ad-label">Full name</label>
            <input
              className="ad-input"
              placeholder="Juan Dela Cruz"
              value={authData.name}
              onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
              style={{ marginBottom: 12 }}
            />
          </>
        )}

        <label className="ad-label">Email</label>
        <input
          className="ad-input"
          type="email"
          placeholder="you@example.com"
          value={authData.email}
          onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
          style={{ marginBottom: 12 }}
        />

        <label className="ad-label">Password</label>
        <input
          className="ad-input"
          type="password"
          placeholder={mode === "register" ? "Minimum 6 characters" : "Enter password"}
          value={authData.password}
          onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleAuth()}
        />

        {authError && <p className="ad-error">⚠️ {authError}</p>}

        <button className="ad-submit-btn" onClick={handleAuth} disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Continue with login" : "Register account"}
        </button>

        <p className="ad-switch">
          {mode === "login" ? (
            <>Need an account? <span onClick={() => { setMode("register"); setAuthError(""); }}>Create one</span></>
          ) : (
            <>Already registered? <span onClick={() => { setMode("login"); setAuthError(""); }}>Log in</span></>
          )}
        </p>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

function SkeletonGrid() {
  return (
    <div className="ad-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="sk-card ad-pulse">
          <div className="sk-img" />
          <div className="sk-line" />
          <div className="sk-line short" />
        </div>
      ))}
    </div>
  );
}

export default function Adopt() {
  const [pets, setPets] = useState([]);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [petsLoading, setPetsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(() => {
    const urlType = searchParams.get("type");
    return urlType && TYPE_ICONS[urlType] ? urlType : "All";
  });
  const [sort, setSort] = useState("default");
  const [ageFilter, setAgeFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");

  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authVersion, setAuthVersion] = useState(0); // bumped on each successful auth

  const [expandedPet, setExpandedPet] = useState(null);
  const [appliedIds, setAppliedIds] = useState(() => new Set());

  // Real-time listener, filtered to a single field ("status"), so it never
  // needs a composite index — the thing that was silently dropping pets when
  // this page queried where(status) + orderBy(createdAt) together. New or
  // edited pets (e.g. a shelter flipping status to "Adopted") update the page
  // live, same as the original version of this page. "Newest first" and
  // "Load more" are both done client-side instead — see createdAtMillis and
  // the sort/slice below.
  useEffect(() => {
    const q = query(collection(db, "pets"), where("status", "==", "Available"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs.map((d) => {
          const data = d.data();
          let rawType = data.type || data.species || "Other";
          let cleanType = rawType
            ? rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase()
            : "Other";
          if (/^(dog|cat|rabbit|bird|parrot)s$/i.test(cleanType)) cleanType = cleanType.slice(0, -1);
          return { id: d.id, ...data, type: cleanType };
        });
        setPets(fetched);
        setLoadError("");
        setPetsLoading(false);
      },
      (err) => {
        console.error("Error fetching pets:", err);
        setLoadError("Couldn't load pets. Check your connection and try again.");
        setPetsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filters/sort/species changing means the old "load more" position no
  // longer makes sense, so start over at one page's worth of results.
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [search, filter, ageFilter, genderFilter, sort]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Preload which pets this user has already applied for, so the UI can
  // show "already applied" without a read on every card open.
  useEffect(() => {
    if (!user) {
      setAppliedIds(new Set());
      return;
    }
    let cancelled = false;
    getDocs(query(collection(db, "applications"), where("userId", "==", user.uid)))
      .then((snap) => {
        if (cancelled) return;
        setAppliedIds(new Set(snap.docs.map((d) => d.data().petId).filter(Boolean)));
      })
      .catch((err) => console.error("Error fetching applications:", err));
    return () => { cancelled = true; };
  }, [user]);

  // Keep the species filter in sync with ?type=, including navbar link clicks
  // while already on this page.
  useEffect(() => {
    const urlType = searchParams.get("type");
    setFilter(urlType && TYPE_ICONS[urlType] ? urlType : "All");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectFilter = (cat) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (cat === "All") next.delete("type");
      else next.set("type", cat);
      return next;
    });
  };

  const filteredPets = useMemo(() => {
    return pets.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (p.name?.toLowerCase() || "").includes(q) ||
        (p.type?.toLowerCase() || "").includes(q) ||
        (p.breed?.toLowerCase() || "").includes(q) ||
        (p.tags && p.tags.some((tag) => tag.toLowerCase().includes(q)));

      const matchesFilter = filter === "All" || p.type === filter;
      const matchesGender =
        genderFilter === "All" ||
        (p.gender || "").toLowerCase() === genderFilter.toLowerCase();
      const matchesAge =
        ageFilter === "All" ||
        ageBucket(p) === ageFilter;

      return matchesSearch && matchesFilter && matchesGender && matchesAge;
    });
  }, [pets, search, filter, ageFilter, genderFilter]);

  const sortedPets = useMemo(() => {
    const result = [...filteredPets];
    switch (sort) {
      case "name":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "youngest":
        result.sort((a, b) => (months(a.age) ?? Infinity) - (months(b.age) ?? Infinity));
        break;
      case "oldest":
        result.sort((a, b) => (months(b.age) ?? 0) - (months(a.age) ?? 0));
        break;
      default:
        result.sort((a, b) => createdAtMillis(b) - createdAtMillis(a));
        break;
    }
    return result;
  }, [filteredPets, sort]);

  const hasMore = sortedPets.length > visibleLimit;
  const displayedPets = useMemo(
    () => sortedPets.slice(0, visibleLimit),
    [sortedPets, visibleLimit]
  );

  const categorizedPets = useMemo(() => {
    const categories = { Dog: [], Cat: [], Rabbit: [], Bird: [], Other: [] };
    displayedPets.forEach((pet) => {
      if (pet.type === "Dog") categories.Dog.push(pet);
      else if (pet.type === "Cat") categories.Cat.push(pet);
      else if (pet.type === "Rabbit") categories.Rabbit.push(pet);
      else if (pet.type === "Parrot" || pet.type === "Bird") categories.Bird.push(pet);
      else categories.Other.push(pet);
    });
    return categories;
  }, [displayedPets]);

  // Sidebar counts derived from data — no duplicated/hardcoded lists.
  const typeCounts = useMemo(() => {
    const counts = { Dog: 0, Cat: 0, Rabbit: 0, Bird: 0, Other: 0 };
    pets.forEach((p) => {
      if (counts[p.type] !== undefined) counts[p.type] += 1;
      else counts.Other += 1;
    });
    return counts;
  }, [pets]);

  const handleApplicationSubmit = async (pet, contact) => {
    if (!user) throw new Error("You must be logged in to submit an application.");

    // Final server-side duplicate check (race-safe), then the batch write.
    const dupSnap = await getDocs(
      query(
        collection(db, "applications"),
        where("petId", "==", pet.id),
        where("userId", "==", user.uid)
      )
    );
    if (!dupSnap.empty) {
      setAppliedIds((prev) => new Set(prev).add(pet.id));
      throw new Error(`You've already applied for ${pet.name}.`);
    }

    const batch = writeBatch(db);

    const appRef = doc(collection(db, "applications"));
    batch.set(appRef, {
      petId: pet.id,
      petName: pet.name,
      petType: pet.type,
      postedBy: pet.postedBy || null,
      postedByRole: pet.postedByRole || null,
      userId: user.uid,
      fullName: contact.fullName.trim(),
      age: parseInt(contact.age, 10) || null,
      phone: contact.phone.trim(),
      email: user.email,
      reason: contact.reason.trim(),
      status: "Pending",
      createdAt: serverTimestamp(),
    });

    const userNotifRef = doc(collection(db, "notifications"));
    batch.set(userNotifRef, {
      userId: user.uid,
      text: `Your adoption application for ${pet.name} has been submitted successfully.`,
      createdAt: serverTimestamp(),
      read: false,
    });

    const ownerId = pet.postedBy || pet.shelterId;
    if (ownerId && ownerId !== user.uid) {
      const ownerNotifRef = doc(collection(db, "notifications"));
      batch.set(ownerNotifRef, {
        userId: ownerId,
        text: `📢 ${contact.fullName.trim()} submitted an adoption application for your pet listing: ${pet.name}.`,
        createdAt: serverTimestamp(),
        type: "adoption_request",
        petId: pet.id,
        read: false,
      });
    }

    await batch.commit();
    setAppliedIds((prev) => new Set(prev).add(pet.id));
  };

  const resetFilters = () => {
    setSearch("");
    selectFilter("All");
    setAgeFilter("All");
    setGenderFilter("All");
    setSort("default");
  };

  return (
    <div className="adopt-root">
      <EmbeddedStyles />

      <section className="ad-hero">
        <h1>Find Your <em>Forever</em> Companion</h1>
        <p>Every pet listed here is rescued, microchipped, fully vaccinated, and ready for adoption.</p>
        <div className="ad-hero-stats">
          <div className="ad-stat">
            <div className="ad-stat-num">{pets.length}</div>
            <div className="ad-stat-label">Available Pets</div>
          </div>
          <div className="ad-stat">
            <div className="ad-stat-num">100%</div>
            <div className="ad-stat-label">Rescued</div>
          </div>
        </div>
      </section>

      <div className="ad-layout">
        <aside className="ad-sidebar">
          <div className="side-card">
            <h3>🐾 Find your perfect pet</h3>

            <h4>Species</h4>
            {Object.keys(TYPE_ICONS).map((cat) => (
              <button
                key={cat}
                className={`sidebar-filter ${filter === cat ? "active" : ""}`}
                onClick={() => selectFilter(cat)}
              >
                <span>{TYPE_ICONS[cat]} {cat === "All" ? "All pets" : `${cat}s`}</span>
                {cat !== "All" && (
                  <span className="sidebar-count">
                    {cat === "Parrot" ? 0 : typeCounts[cat] ?? 0}
                  </span>
                )}
              </button>
            ))}

            <h4>Age</h4>
            {["All", "Baby", "Young", "Adult", "Senior"].map((age) => (
              <button
                key={age}
                className={`sidebar-filter ${ageFilter === age ? "active" : ""}`}
                onClick={() => setAgeFilter(age)}
              >
                {age}
              </button>
            ))}

            <h4>Gender</h4>
            {["All", "Male", "Female"].map((gender) => (
              <button
                key={gender}
                className={`sidebar-filter ${genderFilter === gender ? "active" : ""}`}
                onClick={() => setGenderFilter(gender)}
              >
                {gender}
              </button>
            ))}

            <button className="reset-btn" onClick={resetFilters}>
              ↺ Reset filters
            </button>
          </div>

          <div className="side-card">
            <h3>📊 Available pets</h3>
            {(["Dog", "Cat", "Rabbit", "Bird", "Other"]).map((t) => (
              <p key={t} style={{ margin: "6px 0", fontSize: "0.9rem" }}>
                {TYPE_ICONS[t] || "🐾"} {t === "Bird" ? "Birds" : `${t}s`}: {typeCounts[t]}
              </p>
            ))}
          </div>
        </aside>

        <main className="ad-main">
          <div className="ad-controls">
            <div className="ad-search-wrap">
              <span className="ad-search-icon">🔍</span>
              <input
                className="ad-search"
                placeholder="Search pets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className="ad-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">Sort by</option>
              <option value="name">Name (A-Z)</option>
              <option value="youngest">Youngest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {petsLoading ? (
            <SkeletonGrid />
          ) : loadError ? (
            <div className="ad-empty">
              <p>{loadError}</p>
              <button className="reset-btn" style={{ maxWidth: 200, margin: "16px auto 0" }} onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          ) : sortedPets.length === 0 ? (
            <div className="ad-empty"><p>No pets found matching your criteria.</p></div>
          ) : (
            Object.entries(categorizedPets).map(([category, petGroup]) => {
              if (petGroup.length === 0) return null;
              const icon = TYPE_ICONS[category] || "🐾";
              const title = category === "Other" ? "Other species" : `${category}s`;
              return (
                <section key={category} className="ad-category-section">
                  <h2 className="ad-category-title">
                    <span>{icon} {title}</span>
                    <span className="ad-category-count">({petGroup.length})</span>
                  </h2>
                  <div className="ad-grid">
                    {petGroup.map((pet, i) => (
                      <PetCard key={pet.id} pet={pet} index={i} onExpand={setExpandedPet} />
                    ))}
                  </div>
                </section>
              );
            })
          )}

          {!petsLoading && !loadError && hasMore && (
            <button
              className="ad-loadmore"
              onClick={() => setVisibleLimit((v) => v + PAGE_SIZE)}
            >
              Load more pets
            </button>
          )}
        </main>
      </div>

      <AnimatePresence>
        {expandedPet && (
          <ExpandedPetPanel
            key={expandedPet.id}
            pet={expandedPet}
            user={user}
            applied={appliedIds}
            authVersion={authVersion}
            onClose={() => setExpandedPet(null)}
            onRequireAuth={() => setAuthOpen(true)}
            onSubmit={handleApplicationSubmit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authOpen && (
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onSuccess={() => {
              setAuthOpen(false);
              setAuthVersion((v) => v + 1); // tells the panel to advance to the form
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}