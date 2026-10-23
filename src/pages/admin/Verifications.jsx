import { useEffect, useState } from "react";
import { auth, db, storage } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { VerificationBadge } from "../../components/shared/VerificationPanel";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const fmt = (ts) =>
  ts?.toDate?.().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) || "";

export default function Verifications() {
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const q = query(collection(db, "verifications"), where("status", "==", filter));
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0));
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Couldn't load submissions.");
        setLoading(false);
      }
    );
  }, [filter]);

  // Look up each applicant's name/email once.
  useEffect(() => {
    const missing = items.filter((i) => !people[i.id]).map((i) => i.id);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          const d = snap.exists() ? snap.data() : {};
          return [uid, { name: d.clinicName || d.name || d.shelterName || "Unnamed", email: d.email || "" }];
        } catch {
          return [uid, { name: "Unknown", email: "" }];
        }
      })
    ).then((pairs) => setPeople((prev) => ({ ...prev, ...Object.fromEntries(pairs) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const viewDocument = async (item) => {
    const w = window.open("about:blank", "_blank"); // open first so popup blockers allow it
    try {
      const url = await getDownloadURL(ref(storage, item.documentPath));
      if (w) w.location.href = url;
    } catch (err) {
      console.error(err);
      if (w) w.close();
      setError("Couldn't open that document. Check your Storage rules allow admins to read it.");
    }
  };

  const decide = async (item, status) => {
    const note = (notes[item.id] || "").trim();
    if (status === "rejected" && !note) {
      setError("Add a reason before rejecting so the applicant knows what to fix.");
      return;
    }
    setBusyId(item.id);
    setError("");
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "verifications", item.id), {
        status,
        reviewNote: status === "rejected" ? note : "",
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser.uid,
      });
      // Mirror onto the user doc so maps and lists can show the badge cheaply.
      batch.set(doc(db, "users", item.id), { isVerified: status === "verified" }, { merge: true });
      await batch.commit();
    } catch (err) {
      console.error(err);
      setError("Couldn't save that decision. Check your Firestore rules allow admins to write.");
    }
    setBusyId("");
  };

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px" }}>Verification requests</h2>
      <p style={{ margin: "0 0 20px", color: "#607d8b", fontSize: 14 }}>
        Review licenses and registration papers from vets and shelters.
      </p>

      <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #2e7d32",
              background: filter === f.key ? "#2e7d32" : "#fff",
              color: filter === f.key ? "#fff" : "#2e7d32",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", marginBottom: 14, fontSize: 14 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#90a4ae" }}>Nothing here right now.</p>
      ) : (
        items.map((item) => {
          const p = people[item.id] || {};
          return (
            <div key={item.id} style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,.07)", borderLeft: "5px solid #2e7d32" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{p.name || "Loading…"}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "#607d8b", textTransform: "capitalize" }}>{item.role}</span>
                  <div style={{ fontSize: 13, color: "#607d8b" }}>{p.email}</div>
                </div>
                <VerificationBadge status={item.status} />
              </div>

              <dl style={{ margin: "12px 0", fontSize: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px" }}>
                <dt style={{ color: "#607d8b" }}>{item.role === "vet" ? "License no." : "Registration no."}</dt>
                <dd style={{ margin: 0 }}>{item.idNumber || "—"}</dd>
                <dt style={{ color: "#607d8b" }}>Submitted</dt>
                <dd style={{ margin: 0 }}>{fmt(item.submittedAt) || "—"}</dd>
                <dt style={{ color: "#607d8b" }}>File</dt>
                <dd style={{ margin: 0 }}>
                  <button type="button" onClick={() => viewDocument(item)} style={{ background: "none", border: "none", color: "#1565c0", cursor: "pointer", padding: 0, textDecoration: "underline", fontSize: 14 }}>
                    {item.documentName || "Open document"}
                  </button>
                </dd>
                {item.reviewNote && (
                  <>
                    <dt style={{ color: "#607d8b" }}>Note</dt>
                    <dd style={{ margin: 0 }}>{item.reviewNote}</dd>
                  </>
                )}
              </dl>

              {item.status === "pending" && (
                <>
                  <input
                    aria-label="Reason for rejection"
                    placeholder="Reason (required if rejecting)"
                    value={notes[item.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cfd8dc", borderRadius: 8, boxSizing: "border-box", marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" disabled={busyId === item.id} onClick={() => decide(item, "verified")} style={{ padding: "10px 18px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                      Approve
                    </button>
                    <button type="button" disabled={busyId === item.id} onClick={() => decide(item, "rejected")} style={{ padding: "10px 18px", background: "#fff", color: "#b91c1c", border: "2px solid #b91c1c", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                      Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}