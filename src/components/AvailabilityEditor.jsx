// FILE: src/components/AvailabilityEditor.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { DAYS, emptyWeek, fromInputTime, toInputTime, prettyDate, dateKey } from "../utils/Booking";

const defaultForm = () => ({
  accepting: true,
  slotMinutes: 30,
  weekly: {
    ...emptyWeek(),
    ...Object.fromEntries(["mon", "tue", "wed", "thu", "fri"].map((d) => [d, [{ start: "0900", end: "1200" }, { start: "1300", end: "1700" }]])),
  },
  daysOff: [],
  note: "",
});

/** For vets and shelters: set weekly hours, days off and whether bookings are open. */
export default function AvailabilityEditor({ role = "vet" }) {
  const isShelter = role === "shelter";
  const word = isShelter ? "visits" : "appointments";
  const uid = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(defaultForm);
  const [dayOff, setDayOff] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "availability", uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setForm({
          accepting: d.accepting !== false,
          slotMinutes: d.slotMinutes || 30,
          weekly: { ...emptyWeek(), ...d.weekly },
          daysOff: d.daysOff || [],
          note: d.note || "",
        });
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [uid]);

  const setWindow = (day, i, key, value) =>
    setForm((f) => ({
      ...f,
      weekly: { ...f.weekly, [day]: f.weekly[day].map((w, j) => (j === i ? { ...w, [key]: fromInputTime(value) } : w)) },
    }));
  const addWindow = (day) =>
    setForm((f) => ({ ...f, weekly: { ...f.weekly, [day]: [...f.weekly[day], { start: "0900", end: "1200" }] } }));
  const removeWindow = (day, i) =>
    setForm((f) => ({ ...f, weekly: { ...f.weekly, [day]: f.weekly[day].filter((_, j) => j !== i) } }));

  const addDayOff = () => {
    if (!dayOff || form.daysOff.includes(dayOff)) return;
    setForm((f) => ({ ...f, daysOff: [...f.daysOff, dayOff].sort() }));
    setDayOff("");
  };

  const validate = () => {
    for (const [key, label] of DAYS) {
      const sorted = [...form.weekly[key]].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < sorted.length; i += 1) {
        if (!sorted[i].start || !sorted[i].end || sorted[i].start >= sorted[i].end) return `${label}: each end time must be after its start time.`;
        if (i > 0 && sorted[i].start < sorted[i - 1].end) return `${label}: hours overlap. Merge or fix them.`;
      }
    }
    return "";
  };

  const save = async () => {
    const problem = validate();
    if (problem) return setMsg({ ok: false, text: problem });
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(doc(db, "availability", uid), {
        ownerId: uid,
        role: isShelter ? "shelter" : "vet",
        accepting: form.accepting,
        slotMinutes: Number(form.slotMinutes),
        weekly: form.weekly,
        daysOff: form.daysOff,
        note: form.note.trim().slice(0, 300),
        updatedAt: serverTimestamp(),
      });
      setMsg({ ok: true, text: "Saved. Adopters can now book the times you set." });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: "Couldn't save. Try again." });
    }
    setSaving(false);
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <label style={s.switchRow}>
        <input type="checkbox" checked={form.accepting} onChange={(e) => setForm({ ...form, accepting: e.target.checked })} style={s.check} />
        <span>
          <strong>{form.accepting ? `Accepting ${word}` : `Not accepting ${word}`}</strong>
          <br />
          <small style={s.muted}>Turn this off to pause bookings without losing your hours.</small>
        </span>
      </label>

      <div style={s.field}>
        <label htmlFor="av-slot" style={s.label}>Length of each {isShelter ? "visit" : "appointment"}</label>
        <select id="av-slot" style={s.input} value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: e.target.value })}>
          {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
        </select>
      </div>

      <h4 style={s.h4}>{isShelter ? "Visiting hours" : "Weekly hours"}</h4>
      {DAYS.map(([key, label]) => (
        <div key={key} style={s.dayRow}>
          <strong style={s.dayName}>{label}</strong>
          <div style={{ flex: 1 }}>
            {form.weekly[key].length === 0 && <span style={s.muted}>Closed</span>}
            {form.weekly[key].map((w, i) => (
              <div key={i} style={s.window}>
                <input type="time" aria-label={`${label} opens`} value={toInputTime(w.start)} onChange={(e) => setWindow(key, i, "start", e.target.value)} style={s.time} />
                <span>to</span>
                <input type="time" aria-label={`${label} closes`} value={toInputTime(w.end)} onChange={(e) => setWindow(key, i, "end", e.target.value)} style={s.time} />
                <button type="button" onClick={() => removeWindow(key, i)} aria-label={`Remove ${label} hours`} style={s.linkBtn}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => addWindow(key)} style={s.linkBtn}>+ Add hours</button>
          </div>
        </div>
      ))}

      <h4 style={s.h4}>Days off</h4>
      <div style={s.window}>
        <input type="date" aria-label="Add a day off" min={dateKey(new Date())} value={dayOff} onChange={(e) => setDayOff(e.target.value)} style={s.time} />
        <button type="button" onClick={addDayOff} style={s.secondary}>Add</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 16px" }}>
        {form.daysOff.map((d) => (
          <span key={d} style={s.chip}>
            {prettyDate(d)}
            <button type="button" aria-label={`Remove ${d}`} onClick={() => setForm({ ...form, daysOff: form.daysOff.filter((x) => x !== d) })} style={s.chipX}>✕</button>
          </span>
        ))}
      </div>

      <div style={s.field}>
        <label htmlFor="av-note" style={s.label}>{isShelter ? "Note for visitors (what to bring, parking, rules)" : "Note for clients (what to bring, how to prepare)"}</label>
        <textarea id="av-note" rows={3} maxLength={300} style={s.input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </div>

      {msg && <div role="status" style={{ ...s.msg, background: msg.ok ? "#d1fae5" : "#fee2e2", color: msg.ok ? "#065f46" : "#b91c1c" }}>{msg.text}</div>}
      <button type="button" onClick={save} disabled={saving} style={s.primary}>{saving ? "Saving…" : "Save availability"}</button>
    </div>
  );
}

const s = {
  muted: { color: "#64748b", fontSize: 13 },
  switchRow: { display: "flex", gap: 12, alignItems: "flex-start", padding: 14, background: "#ecf9f8", borderRadius: 12, marginBottom: 16, cursor: "pointer" },
  check: { width: 20, height: 20, marginTop: 2, accentColor: "#0d6b6e" },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", fontSize: 15, border: "1px solid #cfd8dc", borderRadius: 8, boxSizing: "border-box" },
  h4: { margin: "20px 0 8px", fontSize: 15 },
  dayRow: { display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #eef2f6" },
  dayName: { width: 92, flexShrink: 0, fontSize: 14, paddingTop: 6 },
  window: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 6px" },
  time: { padding: "6px 8px", fontSize: 14, border: "1px solid #cfd8dc", borderRadius: 8 },
  linkBtn: { background: "none", border: "none", color: "#0d6b6e", cursor: "pointer", fontSize: 13, textDecoration: "underline", padding: 4 },
  secondary: { padding: "6px 14px", border: "2px solid #0d6b6e", borderRadius: 8, background: "#fff", color: "#0d6b6e", fontWeight: 600, cursor: "pointer" },
  chip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontSize: 13 },
  chipX: { background: "none", border: "none", cursor: "pointer", color: "inherit" },
  msg: { padding: "10px 12px", borderRadius: 8, fontSize: 13, margin: "12px 0" },
  primary: { padding: "12px 22px", background: "#0d6b6e", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
};