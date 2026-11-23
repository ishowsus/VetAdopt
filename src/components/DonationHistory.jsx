// FILE: src/components/DonationHistory.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

const TONE = {
  Pending: { bg: "#fef3c7", fg: "#92400e", label: "Awaiting shelter confirmation" },
  Received: { bg: "#d1fae5", fg: "#065f46", label: "Received" },
  "Not received": { bg: "#fee2e2", fg: "#b91c1c", label: "Shelter couldn't find it" },
  Cancelled: { bg: "#f1f5f9", fg: "#475569", label: "Cancelled" },
};

const toDate = (d) => (d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.date || 0));
const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Opens a printable receipt. Everything inserted is escaped.
function printReceipt(d) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return false;
  const when = toDate(d).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Donation receipt</title>
<style>
body{font-family:Arial,sans-serif;max-width:560px;margin:40px auto;padding:0 20px;color:#0f172a}
h1{margin:0;font-size:22px;color:#0d6b6e} .muted{color:#64748b;font-size:13px}
table{width:100%;border-collapse:collapse;margin:24px 0} td{padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:15px} td:first-child{color:#64748b;width:40%}
.amount{font-size:28px;font-weight:700;color:#0d6b6e} .note{font-size:12px;color:#64748b;margin-top:24px;line-height:1.5}
@media print{button{display:none}}
</style></head><body>
<h1>VetAdopt</h1><p class="muted">Donation receipt</p>
<p class="amount">${esc(peso(d.amount))}</p>
<table>
<tr><td>Receipt no.</td><td>VA-${esc(d.id.slice(0, 8).toUpperCase())}</td></tr>
<tr><td>Date</td><td>${esc(when)}</td></tr>
<tr><td>Donor</td><td>${esc(d.donorName || "Anonymous")}</td></tr>
<tr><td>Donated to</td><td>${esc(d.shelterName || "Shelter")}</td></tr>
<tr><td>Payment method</td><td>${esc(d.paymentMethod || "E-wallet")}</td></tr>
<tr><td>Status</td><td>Received</td></tr>
</table>
<p class="note">Thank you for helping a pet find a second chance. This is a record of your donation issued through VetAdopt. It is not an official BIR receipt. Ask the shelter if you need one for tax purposes.</p>
<button onclick="window.print()" style="padding:10px 20px;font-size:15px;cursor:pointer">Print</button>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/** A donor's own donation history, with receipts for confirmed donations. */
export default function DonationHistory() {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid || null)), []);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return undefined;
    }
    const q = query(collection(db, "donations"), where("donorId", "==", uid));
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => toDate(b) - toDate(a)));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Couldn't load your donations.");
        setLoading(false);
      }
    );
  }, [uid]);

  const stats = useMemo(() => {
    const received = items.filter((d) => d.status === "Received");
    const year = new Date().getFullYear();
    return {
      total: received.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      thisYear: received.filter((d) => toDate(d).getFullYear() === year).reduce((s, d) => s + (Number(d.amount) || 0), 0),
      shelters: new Set(received.map((d) => d.shelterId)).size,
      pending: items.filter((d) => d.status === "Pending").length,
    };
  }, [items]);

  const cancel = async (d) => {
    setBusyId(d.id);
    setError("");
    try {
      await updateDoc(doc(db, "donations", d.id), { status: "Cancelled", updatedAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
      setError("Couldn't cancel that donation.");
    }
    setBusyId("");
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <div style={s.stats}>
        <div style={s.stat}><strong style={s.big}>{peso(stats.total)}</strong><span style={s.muted}>given in total</span></div>
        <div style={s.stat}><strong style={s.big}>{peso(stats.thisYear)}</strong><span style={s.muted}>this year</span></div>
        <div style={s.stat}><strong style={s.big}>{stats.shelters}</strong><span style={s.muted}>shelter{stats.shelters === 1 ? "" : "s"} helped</span></div>
      </div>
      <p style={{ ...s.muted, margin: "0 0 14px" }}>
        Totals count only donations the shelter has confirmed. {stats.pending > 0 && `${stats.pending} still waiting for confirmation.`}
      </p>

      {error && <p role="alert" style={s.error}>{error}</p>}

      {items.length === 0 ? (
        <div style={s.empty}>
          <p style={{ margin: "0 0 10px" }}>You haven't made any donations yet.</p>
          <Link to="/donate" style={s.btn}>Donate to a shelter</Link>
        </div>
      ) : (
        items.map((d) => {
          const tone = TONE[d.status] || TONE.Pending;
          return (
            <div key={d.id} style={s.card}>
              <div style={s.row}>
                <strong>{d.shelterName || "Shelter"}</strong>
                <span style={{ ...s.chip, background: tone.bg, color: tone.fg }}>{tone.label}</span>
              </div>
              <div style={s.muted}>
                {peso(d.amount)} · {d.paymentMethod || "E-wallet"} · {toDate(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              {d.message && <p style={s.note}>“{d.message}”</p>}
              <div style={s.actions}>
                {d.status === "Received" && (
                  <button type="button" style={s.secondary} onClick={() => !printReceipt(d) && setError("Allow pop-ups to print your receipt.")}>Receipt</button>
                )}
                {d.status === "Pending" && (
                  <button type="button" style={s.danger} disabled={busyId === d.id} onClick={() => cancel(d)}>Cancel</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const s = {
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "0 0 10px" },
  stat: { display: "flex", flexDirection: "column", gap: 2, padding: 14, borderRadius: 12, background: "#ecf9f8", border: "1px solid #b8e6e3" },
  big: { fontSize: "1.4rem", color: "#0b5457" },
  muted: { color: "#64748b", fontSize: 13 },
  card: { padding: 14, margin: "0 0 10px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 },
  chip: { padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  note: { margin: "8px 0 0", padding: "8px 10px", background: "#f8fafc", borderRadius: 8, fontSize: 14 },
  actions: { display: "flex", gap: 8, marginTop: 10 },
  secondary: { padding: "7px 16px", border: "2px solid #0d6b6e", borderRadius: 8, background: "#fff", color: "#0d6b6e", fontWeight: 700, cursor: "pointer" },
  danger: { padding: "7px 16px", border: "2px solid #b91c1c", borderRadius: 8, background: "#fff", color: "#b91c1c", fontWeight: 700, cursor: "pointer" },
  btn: { display: "inline-block", padding: "9px 20px", borderRadius: 10, background: "#0d6b6e", color: "#fff", fontWeight: 700, textDecoration: "none" },
  empty: { padding: 24, textAlign: "center", background: "#f8fafc", borderRadius: 12, color: "#64748b" },
  error: { padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 13 },
};