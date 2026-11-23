// FILE: src/components/Bookings.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  OUTCOMES, dateKey, fmtTime, prettyDate, recordVisitOutcome, setAdopterInterest, updateBookingStatus, useBookings,
} from "../utils/booking";

const CHIP = {
  Pending: { bg: "#fef3c7", fg: "#92400e" },
  Confirmed: { bg: "#d1fae5", fg: "#065f46" },
  Declined: { bg: "#fee2e2", fg: "#b91c1c" },
  Cancelled: { bg: "#f1f5f9", fg: "#475569" },
  Completed: { bg: "#dbeafe", fg: "#1e40af" },
};
const Chip = ({ status }) => (
  <span style={{ padding: "2px 10px", borderRadius: 999, background: CHIP[status]?.bg, color: CHIP[status]?.fg, fontSize: 12, fontWeight: 700 }}>{status}</span>
);

const kindLabel = (b) => (b.type === "shelter_visit" ? "Visit" : "Appointment");
const isVisit = (b) => b.type === "shelter_visit";

const nowParts = () => {
  const n = new Date();
  return { today: dateKey(n), nowKey: `${String(n.getHours()).padStart(2, "0")}${String(n.getMinutes()).padStart(2, "0")}` };
};
const hasStarted = (b, { today, nowKey }) => b.date < today || (b.date === today && b.start <= nowKey);

/* Small components live at the top level so typing in a note box doesn't remount them. */

function PendingActions({ b, busy, onAct }) {
  const [note, setNote] = useState("");
  return (
    <>
      <input aria-label="Optional note to the adopter" placeholder="Optional note to them (what to bring, a reason…)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} style={s.input} />
      <div style={s.actions}>
        <button type="button" disabled={busy} onClick={() => onAct(b, "Confirmed", note)} style={s.primary}>Confirm</button>
        <button type="button" disabled={busy} onClick={() => onAct(b, "Declined", note)} style={s.danger}>Decline</button>
      </div>
    </>
  );
}

function OutcomePanel({ b, busy, onPick }) {
  const [note, setNote] = useState("");
  return (
    <div style={s.outcome}>
      <strong style={{ fontSize: 14 }}>How did {b.userName}'s visit with {b.petName || "the pet"} go?</strong>
      <p style={{ ...s.sub, margin: "4px 0 8px" }}>The adopter is notified of your answer.</p>
      <input aria-label="Optional note to the adopter" placeholder="Optional note (what you noticed, next steps…)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} style={s.input} />
      <div style={s.actions}>
        {Object.entries(OUTCOMES).map(([key, o]) => (
          <button key={key} type="button" disabled={busy} onClick={() => onPick(b, key, note)} style={key === "match" ? s.primary : s.secondary}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ManagerCard({ b, children }) {
  const mutual = b.visitOutcome === "match" && b.adopterInterest === "interested";
  return (
    <div style={{ ...s.card, ...(mutual ? s.mutual : {}) }}>
      <div style={s.row}>
        <strong>{prettyDate(b.date)} · {fmtTime(b.start)}–{fmtTime(b.end)}</strong>
        <Chip status={b.status} />
      </div>
      <div style={s.sub}>{b.userName}{b.petName ? ` · about ${b.petName}` : ""} · {kindLabel(b)}</div>
      {b.note && <p style={s.note}>“{b.note}”</p>}
      {b.providerNote && <p style={s.sub}>Your note: {b.providerNote}</p>}
      {b.visitOutcome && (
        <p style={s.sub}>{OUTCOMES[b.visitOutcome].icon} {OUTCOMES[b.visitOutcome].label}{b.outcomeNote ? `: ${b.outcomeNote}` : ""}</p>
      )}
      {b.adopterInterest && (
        <p style={s.sub}>{b.adopterInterest === "interested" ? "❤️ The adopter is interested in adopting" : "The adopter feels it isn't the right fit"}</p>
      )}
      {mutual && <strong style={{ color: "#0b5457", fontSize: 14 }}>💚 You both feel it's a match. They can apply to adopt now.</strong>}
      {children}
    </div>
  );
}

/* ───────────── vet / shelter: requests to answer ───────────── */

export function BookingsManager({ role = "vet" }) {
  const user = auth.currentUser;
  const { loading, items, error } = useBookings("providerId", user?.uid);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const isShelter = role === "shelter";

  const run = async (id, fn) => {
    setBusy(id);
    setErr("");
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setErr("Couldn't update that booking. Try again.");
    }
    setBusy("");
  };
  const actorName = user?.displayName || (isShelter ? "The shelter" : "Your vet");
  const act = (b, status, note) => run(b.id, () => updateBookingStatus(b, status, { actorId: user.uid, actorName, providerNote: note || "" }));
  const outcome = (b, key, note) => run(b.id, () => recordVisitOutcome(b, key, { actorName, note }));

  if (loading) return <p>Loading…</p>;

  const clock = nowParts();
  const pending = items.filter((b) => b.status === "Pending" && b.date >= clock.today);
  const needsOutcome = items.filter(
    (b) => isVisit(b) && ["Confirmed", "Completed"].includes(b.status) && !b.visitOutcome && hasStarted(b, clock)
  );
  const upcoming = items.filter((b) => b.status === "Confirmed" && b.date >= clock.today && !needsOutcome.includes(b));
  const past = items.filter((b) => ![...pending, ...needsOutcome, ...upcoming].includes(b)).reverse();

  return (
    <div>
      {(error || err) && <p role="alert" style={s.error}>{error || err}</p>}

      {needsOutcome.length > 0 && (
        <>
          <h4 style={s.h4}>Tell adopters how the visit went ({needsOutcome.length})</h4>
          {needsOutcome.map((b) => (
            <ManagerCard key={b.id} b={b}>
              <OutcomePanel b={b} busy={busy === b.id} onPick={outcome} />
            </ManagerCard>
          ))}
        </>
      )}

      <h4 style={s.h4}>Needs your answer ({pending.length})</h4>
      {pending.length === 0 && <p style={s.sub}>No new requests.</p>}
      {pending.map((b) => (
        <ManagerCard key={b.id} b={b}>
          <PendingActions b={b} busy={busy === b.id} onAct={act} />
        </ManagerCard>
      ))}

      <h4 style={s.h4}>Upcoming ({upcoming.length})</h4>
      {upcoming.length === 0 && <p style={s.sub}>Nothing confirmed yet.</p>}
      {upcoming.map((b) => (
        <ManagerCard key={b.id} b={b}>
          <div style={s.actions}>
            {!isVisit(b) && <button type="button" disabled={busy === b.id} onClick={() => act(b, "Completed")} style={s.secondary}>Mark completed</button>}
            <button type="button" disabled={busy === b.id} onClick={() => act(b, "Cancelled")} style={s.danger}>Cancel</button>
          </div>
        </ManagerCard>
      ))}

      {past.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer" }}>Past and closed ({past.length})</summary>
          {past.map((b) => <ManagerCard key={b.id} b={b} />)}
        </details>
      )}
    </div>
  );
}

/* ───────────── adopter: my bookings ───────────── */

function InterestPanel({ b, busy, onPick }) {
  return (
    <div style={s.outcome}>
      <strong style={{ fontSize: 14 }}>How was meeting {b.petName || "the pet"}?</strong>
      <div style={s.actions}>
        <button type="button" disabled={busy} onClick={() => onPick(b, "interested")} style={s.primary}>❤️ I'm interested</button>
        <button type="button" disabled={busy} onClick={() => onPick(b, "not_interested")} style={s.secondary}>Not the right fit</button>
      </div>
    </div>
  );
}

function MyCard({ b, canCancel, busy, onCancel, onInterest, onApply, clock }) {
  const visit = isVisit(b);
  const visited = visit && ["Confirmed", "Completed"].includes(b.status) && hasStarted(b, clock);
  return (
    <div style={{ ...s.card, ...(b.visitOutcome === "match" ? s.mutual : {}) }}>
      <div style={s.row}>
        <strong>{b.providerName}</strong>
        <Chip status={b.status} />
      </div>
      <div style={s.sub}>{kindLabel(b)} · {prettyDate(b.date)} at {fmtTime(b.start)}{b.petName ? ` · ${b.petName}` : ""}</div>
      {b.providerNote && <p style={s.note}>{b.providerName}: {b.providerNote}</p>}

      {b.visitOutcome === "match" && (
        <div style={s.matchBanner}>
          <strong>💚 {b.providerName} thinks you and {b.petName || "this pet"} are a match!</strong>
          {b.outcomeNote && <div style={{ marginTop: 4 }}>{b.outcomeNote}</div>}
          <div style={s.actions}>
            <button type="button" onClick={() => onApply(b)} style={s.primary}>Apply to adopt {b.petName || "this pet"}</button>
          </div>
        </div>
      )}
      {b.visitOutcome === "another_visit" && <p style={s.note}>🤔 {b.providerName} would like you to meet {b.petName || "the pet"} again.{b.outcomeNote ? ` ${b.outcomeNote}` : ""}</p>}
      {b.visitOutcome === "not_a_match" && <p style={s.note}>{b.providerName} doesn't think {b.petName || "this pet"} is the right match this time.{b.outcomeNote ? ` ${b.outcomeNote}` : ""}</p>}

      {b.adopterInterest && <p style={s.sub}>{b.adopterInterest === "interested" ? "❤️ You told the shelter you're interested." : "You told the shelter it isn't the right fit."}</p>}
      {visited && !b.adopterInterest && <InterestPanel b={b} busy={busy} onPick={onInterest} />}

      {canCancel && (
        <div style={s.actions}>
          <button type="button" disabled={busy} onClick={() => onCancel(b)} style={s.danger}>Cancel booking</button>
        </div>
      )}
    </div>
  );
}

export function MyBookings() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { loading, items, error } = useBookings("userId", user?.uid);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const run = async (id, fn, msg) => {
    setBusy(id);
    setErr("");
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setErr(msg);
    }
    setBusy("");
  };
  const name = user?.displayName || "The adopter";
  const cancel = (b) => run(b.id, () => updateBookingStatus(b, "Cancelled", { actorId: user.uid, actorName: name }), "Couldn't cancel. Try again.");
  const interest = (b, v) => run(b.id, () => setAdopterInterest(b, v, { actorName: name }), "Couldn't save that. Try again.");
  const apply = (b) => navigate(`/adopt?q=${encodeURIComponent(b.petName || "")}`);

  if (loading) return <p>Loading…</p>;
  if (items.length === 0) return <p style={s.sub}>No bookings yet. Use “Visit” on a shelter's pet to meet them in person.</p>;

  const clock = nowParts();
  const upcoming = items.filter((b) => b.date >= clock.today && ["Pending", "Confirmed"].includes(b.status));
  const rest = items.filter((b) => !upcoming.includes(b)).reverse();
  const card = (b) => (
    <MyCard key={b.id} b={b} clock={clock} busy={busy === b.id} canCancel={upcoming.includes(b) && !hasStarted(b, clock)} onCancel={cancel} onInterest={interest} onApply={apply} />
  );

  return (
    <div>
      {(error || err) && <p role="alert" style={s.error}>{error || err}</p>}
      <h4 style={s.h4}>Upcoming ({upcoming.length})</h4>
      {upcoming.length === 0 && <p style={s.sub}>Nothing coming up.</p>}
      {upcoming.map(card)}
      {rest.length > 0 && (
        <details open={rest.some((b) => b.visitOutcome) || undefined} style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer" }}>Past visits and closed ({rest.length})</summary>
          {rest.map(card)}
        </details>
      )}
    </div>
  );
}

const s = {
  h4: { margin: "18px 0 8px", fontSize: 15 },
  card: { padding: 14, margin: "0 0 10px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" },
  mutual: { borderColor: "#8fdcd8", background: "#ecf9f8" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sub: { color: "#64748b", fontSize: 13, margin: "4px 0" },
  note: { margin: "8px 0", padding: "8px 10px", background: "#f8fafc", borderRadius: 8, fontSize: 14 },
  outcome: { marginTop: 10, padding: 12, background: "#ecf9f8", border: "1px solid #b8e6e3", borderRadius: 10 },
  matchBanner: { margin: "8px 0", padding: 12, background: "#d6f2f0", border: "1px solid #8fdcd8", borderRadius: 10, color: "#0b5457", fontSize: 14 },
  input: { width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box", margin: "6px 0" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  primary: { padding: "8px 18px", border: "none", borderRadius: 8, background: "#0d6b6e", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { padding: "8px 18px", border: "2px solid #0d6b6e", borderRadius: 8, background: "#fff", color: "#0d6b6e", fontWeight: 700, cursor: "pointer" },
  danger: { padding: "8px 18px", border: "2px solid #b91c1c", borderRadius: 8, background: "#fff", color: "#b91c1c", fontWeight: 700, cursor: "pointer" },
  error: { padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 13 },
};