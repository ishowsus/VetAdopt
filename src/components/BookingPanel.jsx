import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { createBooking, dateKey, fmtTime, generateSlots, parseDateKey, prettyDate, useAvailability, useTakenSlots } from "../utils/booking";

const DAYS_AHEAD = 14;

const normRole = (r) => {
  const x = String(r || "").toLowerCase();
  return x === "veterinarian" ? "vet" : x;
};

/**
 * Pick a date and time with a vet or shelter.
 *   providerId   uid of the vet / shelter
 *   pet          optional { id, name }, for shelter visits about one pet
 *   onBack       optional, shows a "Back" button (when embedded in another screen)
 */
export default function BookingPanel({ providerId, pet = null, onBack }) {
  const [provider, setProvider] = useState(null);
  const { loading, data: avail } = useAvailability(providerId);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const taken = useTakenSlots(providerId, date);

  useEffect(() => {
    getDoc(doc(db, "users", providerId))
      .then((s) => {
        const d = s.exists() ? s.data() : {};
        setProvider({
          id: providerId,
          role: normRole(d.role),
          name: d.shelterName || d.clinicName || d.name || "this provider",
          verified: d.isVerified === true,
          address: d.address || "",
        });
      })
      .catch(() => setProvider({ id: providerId, role: "", name: "this provider", verified: false, address: "" }));
  }, [providerId]);

  const days = useMemo(() => {
    const out = [];
    const base = new Date();
    for (let i = 0; i < DAYS_AHEAD; i += 1) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const key = dateKey(d);
      out.push({ key, d, hasSlots: generateSlots(avail, key).length > 0 });
    }
    return out;
  }, [avail]);

  // Start on the first day that has open times.
  useEffect(() => {
    if (!date) {
      const first = days.find((x) => x.hasSlots);
      if (first) setDate(first.key);
    }
  }, [days, date]);

  const slots = useMemo(() => (date ? generateSlots(avail, date, taken) : []), [avail, date, taken]);
  useEffect(() => setSlot(null), [date]);

  const isShelter = provider?.role === "shelter";
  const mapsUrl = provider?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}` : "";

  const submit = async () => {
    const user = auth.currentUser;
    if (!user || !slot || !provider) return;
    setSubmitting(true);
    setError("");
    try {
      await user.reload();
      if (!user.emailVerified) throw new Error("Please verify your email first. You can do it from your profile page.");
      await user.getIdToken(true);
      await createBooking({
        meId: user.uid,
        myName: user.displayName || "An adopter",
        provider,
        pet,
        note,
        date,
        slot,
      });
      setDone({ date, slot });
    } catch (err) {
      console.error(err);
      setError(
        err.code === "permission-denied"
          ? "That time was just taken or isn't available anymore. Pick another."
          : err.message || "Couldn't send your request. Try again."
      );
      setSlot(null);
    }
    setSubmitting(false);
  };

  if (loading || !provider) return <p style={s.muted}>Loading…</p>;

  if (done) {
    return (
      <div style={s.wrap}>
        <h3 style={s.h3}>Request sent ✅</h3>
        <p style={{ margin: "0 0 12px" }}>
          {provider.name} will confirm your {isShelter ? "visit" : "appointment"} for <strong>{prettyDate(done.date)} at {fmtTime(done.slot.start)}</strong>.
          You'll get a notification, and you can see the status under <strong>My bookings</strong> in your profile.
        </p>
        <div style={s.tips}>
          <strong>{isShelter ? "Before your visit" : "Before your appointment"}</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {isShelter ? (
              <>
                <li>Bring a valid ID, and bring everyone who lives with you if you can.</li>
                <li>Spend time with {pet?.name || "the pet"} calmly. Notice how it reacts to you and to being handled.</li>
                <li>Ask about its energy, health, history, and what a typical day looks like.</li>
                <li>Think honestly about your schedule, space and budget. A good match matters more than a quick one.</li>
              </>
            ) : (
              <>
                <li>Bring your pet's vaccine and medical records.</li>
                <li>Write down any symptoms and when they started.</li>
                <li>Arrive a few minutes early.</li>
              </>
            )}
          </ul>
          {avail?.note && <p style={{ margin: "8px 0 0" }}><strong>From {provider.name}:</strong> {avail.note}</p>}
        </div>
        {mapsUrl && <p style={{ marginTop: 12 }}><a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={s.link}>📍 Get directions to {provider.address}</a></p>}
        {onBack && <button type="button" onClick={onBack} style={{ ...s.secondary, marginTop: 8 }}>Done</button>}
      </div>
    );
  }

  const closed = !avail || !avail.accepting;

  return (
    <div style={s.wrap}>
      {onBack && <button type="button" onClick={onBack} style={s.back}>← Back</button>}
      <h3 style={s.h3}>
        {isShelter ? `Visit ${provider.name}` : `Book with ${provider.name}`}
        {provider.verified && <span title="Verified" aria-label="Verified" style={s.check}>✓</span>}
      </h3>
      {isShelter && pet && <p style={s.muted}>Meet {pet.name} in person to see if you're a good match.</p>}
      {provider.address && <p style={s.muted}>📍 {provider.address}</p>}

      {closed ? (
        <div style={s.tips}>
          {provider.name} isn't taking {isShelter ? "visits" : "appointments"} online right now.{" "}
          <Link to={`/messages?with=${providerId}`} style={s.link}>Send a message instead</Link>.
        </div>
      ) : (
        <>
          <div role="group" aria-label="Choose a date" style={s.strip}>
            {days.map(({ key, d, hasSlots }) => (
              <button
                key={key}
                type="button"
                disabled={!hasSlots}
                aria-pressed={date === key}
                onClick={() => setDate(key)}
                style={{ ...s.day, ...(date === key ? s.dayOn : {}), ...(!hasSlots ? s.dayOff : {}) }}
              >
                <span style={{ fontSize: 11 }}>{d.toLocaleDateString([], { weekday: "short" })}</span>
                <strong style={{ fontSize: 18 }}>{d.getDate()}</strong>
                <span style={{ fontSize: 11 }}>{d.toLocaleDateString([], { month: "short" })}</span>
              </button>
            ))}
          </div>

          {!days.some((x) => x.hasSlots) ? (
            <p style={s.muted}>No open times in the next {DAYS_AHEAD} days.</p>
          ) : (
            <>
              <p style={{ ...s.muted, margin: "14px 0 8px" }}>{date ? prettyDate(date) : ""}</p>
              {slots.length === 0 ? (
                <p style={s.muted}>No times left on this day. Try another date.</p>
              ) : (
                <div role="group" aria-label="Choose a time" style={s.slots}>
                  {slots.map((sl) => (
                    <button key={sl.start} type="button" aria-pressed={slot?.start === sl.start} onClick={() => setSlot(sl)} style={{ ...s.slot, ...(slot?.start === sl.start ? s.slotOn : {}) }}>
                      {fmtTime(sl.start)}
                    </button>
                  ))}
                </div>
              )}

              <label htmlFor="bk-note" style={{ ...s.label, marginTop: 14 }}>Anything they should know? (optional)</label>
              <textarea id="bk-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} style={s.input} placeholder={isShelter ? "For example: I'm bringing my two kids" : "For example: my dog has been limping"} />

              {error && <p role="alert" style={s.error}>{error}</p>}
              <button type="button" onClick={submit} disabled={!slot || submitting} style={{ ...s.primary, opacity: !slot || submitting ? 0.5 : 1 }}>
                {submitting ? "Sending…" : slot ? `Request ${fmtTime(slot.start)}` : "Pick a time"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Same panel in a popup. Use it from pages that don't have their own modal (e.g. the vet map). */
export function BookingModal({ providerId, pet, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Book a time" onClick={onClose} style={s.overlay}>
      <div onClick={(e) => e.stopPropagation()} style={s.modal}>
        <button type="button" onClick={onClose} aria-label="Close" style={s.x}>✕</button>
        <BookingPanel providerId={providerId} pet={pet} onBack={onClose} />
      </div>
    </div>,
    document.body
  );
}

/** Button + popup in one. <BookingButton providerId={vet.id} me={user} onRequireAuth={...} /> */
export function BookingButton({ providerId, pet, me, onRequireAuth, children = "📅 Book" }) {
  const [open, setOpen] = useState(false);
  if (!providerId || me?.uid === providerId) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!me) return onRequireAuth?.();
          setOpen(true);
        }}
        style={{ padding: "6px 14px", border: "2px solid #16a34a", borderRadius: 999, background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
      >
        {children}
      </button>
      {open && <BookingModal providerId={providerId} pet={pet} onClose={() => setOpen(false)} />}
    </>
  );
}

const s = {
  wrap: { color: "#0f172a" },
  h3: { margin: "0 0 6px", fontSize: "1.15rem" },
  muted: { color: "#64748b", fontSize: 14, margin: "4px 0" },
  check: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, marginLeft: 8, borderRadius: "50%", background: "#16a34a", color: "#fff", fontSize: 11 },
  back: { background: "none", border: "none", color: "#15803d", cursor: "pointer", padding: 0, marginBottom: 8, fontWeight: 600 },
  strip: { display: "flex", gap: 8, overflowX: "auto", padding: "10px 0 4px" },
  day: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 58, padding: "8px 6px", border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", cursor: "pointer", color: "#0f172a" },
  dayOn: { background: "#15803d", borderColor: "#15803d", color: "#fff" },
  dayOff: { opacity: 0.4, cursor: "not-allowed" },
  slots: { display: "flex", flexWrap: "wrap", gap: 8 },
  slot: { padding: "8px 14px", border: "1px solid #cbd5e1", borderRadius: 999, background: "#fff", cursor: "pointer", fontWeight: 600, color: "#0f172a" },
  slotOn: { background: "#15803d", borderColor: "#15803d", color: "#fff" },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" },
  error: { margin: "10px 0 0", padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 13 },
  primary: { marginTop: 14, padding: "12px 22px", background: "#15803d", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" },
  secondary: { padding: "10px 20px", background: "#fff", color: "#15803d", border: "2px solid #15803d", borderRadius: 10, fontWeight: 700, cursor: "pointer" },
  tips: { padding: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, fontSize: 14 },
  link: { color: "#15803d", fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(15,23,42,.6)" },
  modal: { position: "relative", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 24, background: "#fff", borderRadius: 18 },
  x: { position: "absolute", top: 10, right: 12, border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#64748b" },
};