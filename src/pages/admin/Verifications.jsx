// FILE: src/pages/admin/Verifications.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { loadVerificationFiles, deleteVerificationFile, dataUrlToBlobUrl } from "../../utils/verificationFile";
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
import { VerificationBadge } from "../../components/shared/VerificationPanel";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Approved" },
  { key: "rejected", label: "Declined" },
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
  const [roleFilter, setRoleFilter] = useState("all");
  const [previews, setPreviews] = useState({}); // id -> image url
  const [pendingCount, setPendingCount] = useState(0);

  // Live count for the "Pending" tab, whichever tab is open.
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "verifications"), where("status", "==", "pending")),
        (s) => setPendingCount(s.size),
        () => {}
      ),
    []
  );

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

  const roleOf = (r) => (String(r || "").toLowerCase() === "veterinarian" ? "vet" : String(r || "").toLowerCase());
  const visible = items.filter((i) => roleFilter === "all" || roleOf(i.role) === roleFilter);

  const isImage = (item) => item.documentPath?.endsWith("/inline") || /\.(jpe?g|png|webp)$/i.test(item.documentName || "");

  const togglePreview = async (item) => {
    if (previews[item.id]) return setPreviews((p) => ({ ...p, [item.id]: "" }));
    try {
      const list = await loadVerificationFiles(item.id);
      if (list.length === 0) throw new Error("missing");
      setPreviews((p) => ({ ...p, [item.id]: list }));
    } catch (err) {
      console.error(err);
      setError("Couldn't load that photo. It may have been deleted, or the rules don't let admins read it yet.");
    }
  };

  const viewDocument = async (item) => {
    const w = window.open("about:blank", "_blank"); // open first so popup blockers allow it
    try {
      const list = await loadVerificationFiles(item.id);
      if (list.length === 0) throw new Error("missing");
      if (w) w.location.href = dataUrlToBlobUrl(list[0].url);
    } catch (err) {
      console.error(err);
      if (w) w.close();
      setError("Couldn't open that photo. It may have been deleted, or the rules don't let admins read it yet.");
    }
  };

  const decide = async (item, status) => {
    const note = (notes[item.id] || "").trim();
    if (status === "rejected" && !note) {
      setError("Add a reason before declining so the applicant knows what to fix.");
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
        // ID photos are deleted once reviewed; only the decision is kept.
        ...(item.role === "adopter" ? { documentPath: "", documentName: "ID deleted after review" } : {}),
      });
      // Mirror onto the user doc so maps and lists can show the badge cheaply.
      batch.set(doc(db, "users", item.id), { isVerified: status === "verified" }, { merge: true });
      // Tell the applicant, so they don't have to keep checking.
      batch.set(doc(collection(db, "notifications")), {
        userId: item.id,
        text:
          status === "verified"
            ? "✅ Your verification was approved. A verified badge now shows on your profile."
            : `Your verification was declined. Reason: ${note}. You can fix it and submit again from your profile.`,
        type: "verification",
        createdAt: serverTimestamp(),
        read: false,
      });
      await batch.commit();
      if (item.role === "adopter") deleteVerificationFile(item.id).catch(() => {}); // the ID photo is removed after review
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
        Review vet licenses, shelter registrations and adopter IDs. Approving shows a verified badge; declining needs a reason so they can fix it.
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
              border: "1px solid #0d6b6e",
              background: filter === f.key ? "#0d6b6e" : "#fff",
              color: filter === f.key ? "#fff" : "#0d6b6e",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f.label}
            {f.key === "pending" && pendingCount > 0 && (
              <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 999, background: filter === "pending" ? "#fff" : "#dc2626", color: filter === "pending" ? "#0d6b6e" : "#fff", fontSize: 12, fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Filter by account type" style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[["all", "Everyone"], ["vet", "Vets"], ["shelter", "Shelters"], ["adopter", "Adopters"]].map(([k, label]) => (
          <button key={k} type="button" aria-pressed={roleFilter === k} onClick={() => setRoleFilter(k)} style={{ padding: "5px 14px", borderRadius: 999, border: "1px solid #cfd8dc", background: roleFilter === k ? "#37474f" : "#fff", color: roleFilter === k ? "#fff" : "#37474f", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {label}
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
      ) : visible.length === 0 ? (
        <p style={{ color: "#90a4ae" }}>{filter === "pending" ? "No pending requests. New submissions show up here instantly." : "Nothing here right now."}</p>
      ) : (
        visible.map((item) => {
          const p = people[item.id] || {};
          return (
            <div key={item.id} style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,.07)", borderLeft: "5px solid #0d6b6e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{p.name || "Loading…"}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color: "#607d8b", textTransform: "capitalize" }}>{item.role}</span>
                  <div style={{ fontSize: 13, color: "#607d8b" }}>{p.email}</div>
                </div>
                <VerificationBadge status={item.status} />
              </div>

              <dl style={{ margin: "12px 0", fontSize: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px" }}>
                {item.role !== "adopter" && (
                  <>
                    <dt style={{ color: "#607d8b" }}>{item.role === "vet" ? "License no." : "Registration no."}</dt>
                    <dd style={{ margin: 0 }}>{item.idNumber || "—"}</dd>
                  </>
                )}
                <dt style={{ color: "#607d8b" }}>Submitted</dt>
                <dd style={{ margin: 0 }}>{fmt(item.submittedAt) || "—"}</dd>
                <dt style={{ color: "#607d8b" }}>File</dt>
                <dd style={{ margin: 0 }}>
                  {item.documentPath ? (
                    <>
                      <button type="button" onClick={() => viewDocument(item)} style={{ background: "none", border: "none", color: "#1565c0", cursor: "pointer", padding: 0, textDecoration: "underline", fontSize: 14 }}>
                        {item.documentName || "Open document"}
                      </button>
                      {isImage(item) && (
                        <button type="button" onClick={() => togglePreview(item)} style={{ marginLeft: 12, background: "none", border: "none", color: "#0d6b6e", cursor: "pointer", padding: 0, fontWeight: 600, fontSize: 14 }}>
                          {previews[item.id] ? "Hide preview" : "👁 Preview here"}
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ color: "#607d8b" }}>{item.documentName || "No file"}</span>
                  )}
                </dd>
                {item.reviewNote && (
                  <>
                    <dt style={{ color: "#607d8b" }}>Note</dt>
                    <dd style={{ margin: 0 }}>{item.reviewNote}</dd>
                  </>
                )}
              </dl>

              {previews[item.id]?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "0 0 12px" }}>
                  {previews[item.id].map((f, i) => (
                    <a key={`${f.name}-${i}`} href={f.url} onClick={(e) => { e.preventDefault(); window.open(dataUrlToBlobUrl(f.url), "_blank"); }} title="Open full size">
                      <img src={f.url} alt={`Document ${i + 1} from ${p.name || "applicant"}`} style={{ maxWidth: "100%", maxHeight: 340, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                    </a>
                  ))}
                </div>
              )}

              {item.status === "pending" && (
                <>
                  <input
                    aria-label="Reason for declining"
                    placeholder="Reason (required if declining)"
                    value={notes[item.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cfd8dc", borderRadius: 8, boxSizing: "border-box", marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" disabled={busyId === item.id} onClick={() => decide(item, "verified")} style={{ padding: "10px 18px", background: "#0d6b6e", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                      Approve
                    </button>
                    <button type="button" disabled={busyId === item.id} onClick={() => decide(item, "rejected")} style={{ padding: "10px 18px", background: "#fff", color: "#b91c1c", border: "2px solid #b91c1c", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                      Decline
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