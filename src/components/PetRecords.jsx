// FILE: src/components/PetRecords.jsx
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

const today = () => new Date().toISOString().split("T")[0];

/** An adopter's view of the medical records their vets have added for their pets. */
export default function PetRecords() {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid || null)), []);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return undefined;
    }
    return onSnapshot(
      query(collection(db, "medicalRecords"), where("ownerId", "==", uid)),
      (snap) => {
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || "").localeCompare(a.date || "")));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Couldn't load your pets' records.");
        setLoading(false);
      }
    );
  }, [uid]);

  const byPet = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      const k = r.petName || "Your pet";
      map.set(k, [...(map.get(k) || []), r]);
    });
    return [...map.entries()];
  }, [records]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>;
  if (records.length === 0) {
    return (
      <p style={{ color: "#64748b" }}>
        No records yet. When a vet adds a medical record for your pet after a visit, it appears here with any follow-up dates.
      </p>
    );
  }

  return (
    <div>
      {byPet.map(([pet, list]) => (
        <section key={pet} style={{ marginBottom: 22 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>🐾 {pet}</h3>
          {list.map((r) => {
            const late = r.followUp && r.followUp < today();
            return (
              <div key={r.id} style={s.card}>
                <div style={s.row}>
                  <strong>{r.type || "Record"}</strong>
                  <span style={s.muted}>{r.date}</span>
                </div>
                <div style={s.muted}>by {r.vetName || "your vet"}</div>
                {[["Diagnosis", r.diagnosis], ["Treatment", r.treatment], ["Medication", r.medication], ["Vaccines", r.vaccines], ["Weight", r.weight != null && r.weight !== "" ? `${r.weight} kg` : ""], ["Notes", r.notes]]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} style={s.line}><span style={s.k}>{k}:</span> {v}</div>
                  ))}
                {r.followUp && (
                  <div style={{ ...s.follow, ...(late ? s.late : {}) }}>🔔 Follow-up: {r.followUp}{late && " (past due, please book a visit)"}</div>
                )}
              </div>
            );
          })}
        </section>
      ))}
      <p style={{ ...s.muted, marginTop: 8 }}>These records are added by your vet. Contact them if something looks wrong.</p>
    </div>
  );
}

const s = {
  card: { padding: 14, margin: "0 0 10px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" },
  row: { display: "flex", justifyContent: "space-between", gap: 8 },
  muted: { color: "#64748b", fontSize: 13 },
  line: { fontSize: 14, margin: "6px 0 0", color: "#334155" },
  k: { fontWeight: 700, color: "#0b5457" },
  follow: { marginTop: 10, display: "inline-block", padding: "5px 12px", borderRadius: 8, background: "#e0f2fe", color: "#075985", fontSize: 13, fontWeight: 600 },
  late: { background: "#fee2e2", color: "#b91c1c" },
};