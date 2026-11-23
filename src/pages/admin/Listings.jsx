// FILE: src/pages/admin/Listings.jsx
import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../../firebase";

/** Admin: approve or reject pets that adopters submitted for rehoming. */
export default function Listings() {
  const [items, setItems] = useState([]);
  const [owners, setOwners] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const q = query(collection(db, "pets"), where("status", "==", "Pending Review"));
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Couldn't load listings.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const missing = [...new Set(items.map((i) => i.postedBy).filter(Boolean))].filter((id) => !owners[id]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (id) => {
        try {
          const s = await getDoc(doc(db, "users", id));
          const d = s.exists() ? s.data() : {};
          return [id, { name: d.name || d.displayName || "Unknown", email: d.email || "", verified: d.isVerified === true }];
        } catch {
          return [id, { name: "Unknown", email: "", verified: false }];
        }
      })
    ).then((pairs) => setOwners((prev) => ({ ...prev, ...Object.fromEntries(pairs) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const decide = async (p, approve) => {
    const note = (notes[p.id] || "").trim();
    if (!approve && !note) {
      setError("Add a reason before rejecting, so the owner knows what to fix.");
      return;
    }
    setBusyId(p.id);
    setError("");
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "pets", p.id), {
        status: approve ? "Available" : "Rejected",
        reviewNote: approve ? "" : note,
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser.uid,
      });
      batch.set(doc(collection(db, "notifications")), {
        userId: p.postedBy,
        text: approve ? `🐾 ${p.name} is now live and can be found by adopters.` : `Your listing for ${p.name} wasn't approved. Reason: ${note}`,
        type: "listing",
        createdAt: serverTimestamp(),
        read: false,
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
      setError("Couldn't save that decision.");
    }
    setBusyId("");
  };

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px" }}>Pet listings to review</h2>
      <p style={{ margin: "0 0 20px", color: "#607d8b", fontSize: 14 }}>
        Check the photos and details. Look for sale prices, stock photos and anything that looks like a scam.
      </p>
      {error && <div role="alert" style={{ padding: "10px 14px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", marginBottom: 14, fontSize: 14 }}>{error}</div>}
      {loading ? <p>Loading…</p> : items.length === 0 ? <p style={{ color: "#90a4ae" }}>Nothing waiting for review.</p> : items.map((p) => {
        const o = owners[p.postedBy] || {};
        return (
          <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,.07)", borderLeft: "5px solid #0d6b6e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <strong style={{ fontSize: 17 }}>{p.name}</strong>
              <span style={{ fontSize: 13, color: "#607d8b" }}>
                Posted by {o.name || "…"}{o.verified && " ✓ ID verified"}{o.email ? ` · ${o.email}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
              {(p.photos?.length ? p.photos : [p.photoUrl]).filter(Boolean).map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt={`${p.name}`} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10 }} /></a>
              ))}
            </div>
            <dl style={{ margin: "8px 0", fontSize: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px" }}>
              <dt style={{ color: "#607d8b" }}>Details</dt><dd style={{ margin: 0 }}>{[p.type, p.breed, p.age, p.gender, p.city].filter(Boolean).join(" · ")}</dd>
              <dt style={{ color: "#607d8b" }}>Health</dt><dd style={{ margin: 0 }}>{(p.tags || []).join(", ") || "Not stated"}</dd>
              <dt style={{ color: "#607d8b" }}>About</dt><dd style={{ margin: 0 }}>{p.description}</dd>
              <dt style={{ color: "#607d8b" }}>Reason</dt><dd style={{ margin: 0 }}>{p.reason}</dd>
            </dl>
            <input aria-label="Reason for rejection" placeholder="Reason (required if rejecting)" value={notes[p.id] || ""} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cfd8dc", borderRadius: 8, boxSizing: "border-box", margin: "6px 0 10px" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" disabled={busyId === p.id} onClick={() => decide(p, true)} style={{ padding: "10px 18px", background: "#0d6b6e", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>Approve</button>
              <button type="button" disabled={busyId === p.id} onClick={() => decide(p, false)} style={{ padding: "10px 18px", background: "#fff", color: "#b91c1c", border: "2px solid #b91c1c", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}