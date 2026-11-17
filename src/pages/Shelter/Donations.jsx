import { useEffect, useMemo, useState } from "react";
import { collection, addDoc, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";

const FILTERS = ["All", "Pending", "Received", "Not received"];
// Older records were logged by hand before statuses existed, so no status means received.
const statusOf = (d) => d.status || "Received";
const toDate = (d) => (d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.date || 0));
const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

const TONE = {
  Pending: { bg: "#fef3c7", fg: "#92400e" },
  Received: { bg: "#d1fae5", fg: "#065f46" },
  "Not received": { bg: "#fee2e2", fg: "#b91c1c" },
  Cancelled: { bg: "#f1f5f9", fg: "#475569" },
};

// Cells starting with = + - @ can run as formulas in Excel, so they get a leading quote.
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

function Donations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");

  // E-Wallet payment details (placeholders: replace with real numbers from the shelter profile)
  const eWalletDetails = {
    gcashNumber: "0917-XXX-XXXX",
    gcashAccountName: "Shelter GCash Account",
    mayaNumber: "0917-XXX-XXXX",
    mayaAccountName: "Shelter Maya Account",
  };

  const [form, setForm] = useState({ donorName: "", amount: "", purpose: "General Support", notes: "" });

  // Live list, so online donations show up (and confirmations update) without a refresh.
  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubSnap?.();
      unsubSnap = null;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const q = query(collection(db, "donations"), where("shelterId", "==", currentUser.uid));
      unsubSnap = onSnapshot(
        q,
        (snap) => {
          setDonations(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => toDate(b) - toDate(a)));
          setLoading(false);
        },
        (err) => {
          console.error("Error loading donations:", err);
          setError("Couldn't load donations.");
          setLoading(false);
        }
      );
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  const handleInputChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleAddDonation = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid donation amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "donations"), {
        shelterId: currentUser.uid,
        donorName: form.donorName.trim() || "Anonymous",
        amount: Number(form.amount),
        purpose: form.purpose.trim() || "General",
        paymentMethod: "E-Wallet",
        notes: form.notes.trim(),
        date: new Date().toISOString().split("T")[0],
        status: "Received",
        source: "manual",
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setForm({ donorName: "", amount: "", purpose: "General Support", notes: "" });
    } catch (err) {
      console.error("Failed to record donation:", err);
      setError("Failed to save donation record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // The shelter checks its own e-wallet, then confirms or flags an online donation.
  const decide = async (d, status) => {
    setBusyId(d.id);
    setError("");
    try {
      const shelterName = auth.currentUser?.displayName || "The shelter";
      const batch = writeBatch(db);
      batch.update(doc(db, "donations", d.id), { status, confirmedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      if (d.donorId) {
        batch.set(doc(collection(db, "notifications")), {
          userId: d.donorId,
          text:
            status === "Received"
              ? `💚 ${shelterName} confirmed your ${peso(d.amount)} donation. Thank you!`
              : `ℹ️ ${shelterName} couldn't find your ${peso(d.amount)} donation yet. Check your e-wallet or message them.`,
          type: "donation",
          createdAt: serverTimestamp(),
          read: false,
        });
      }
      await batch.commit();
    } catch (err) {
      console.error(err);
      setError("Couldn't update that donation. Try again.");
    }
    setBusyId("");
  };

  const stats = useMemo(() => {
    const received = donations.filter((d) => statusOf(d) === "Received");
    const now = new Date();
    const sum = (list) => list.reduce((t, d) => t + (Number(d.amount) || 0), 0);
    return {
      total: sum(received),
      month: sum(received.filter((d) => toDate(d).getMonth() === now.getMonth() && toDate(d).getFullYear() === now.getFullYear())),
      pendingCount: donations.filter((d) => d.status === "Pending").length,
      pendingAmount: sum(donations.filter((d) => d.status === "Pending")),
      receivedCount: received.length,
    };
  }, [donations]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donations.filter(
      (d) =>
        (filter === "All" || statusOf(d) === filter) &&
        (!q || `${d.donorName || ""} ${d.purpose || ""} ${d.message || ""}`.toLowerCase().includes(q))
    );
  }, [donations, filter, search]);

  const exportCsv = () => {
    const rows = [["Date", "Donor", "Amount (PHP)", "Method", "Status", "Purpose", "Message", "Source"]];
    visible.forEach((d) =>
      rows.push([d.date || "", d.donorName || "Anonymous", d.amount, d.paymentMethod || "E-Wallet", statusOf(d), d.purpose || "", d.message || d.notes || "", d.source || "manual"])
    );
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `donations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <h2 style={{ textAlign: "center", marginTop: "40px" }}>Loading...</h2>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>💰 E-Wallet & Donations</h2>
          <p style={styles.subtitle}>Donation history and confirmations</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={styles.secondaryButton} onClick={exportCsv} disabled={visible.length === 0}>⬇ Export CSV</button>
          <button style={styles.addButton} onClick={() => setShowModal(true)}>+ Log E-Wallet Payment</button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.statGrid}>
        <div style={styles.statCard}><span style={styles.statLabel}>Received in total</span><strong style={styles.statValue}>{peso(stats.total)}</strong><span style={styles.statSub}>{stats.receivedCount} confirmed</span></div>
        <div style={styles.statCard}><span style={styles.statLabel}>This month</span><strong style={styles.statValue}>{peso(stats.month)}</strong></div>
        <div style={{ ...styles.statCard, ...(stats.pendingCount ? styles.statAlert : {}) }}><span style={styles.statLabel}>Waiting for you to confirm</span><strong style={styles.statValue}>{stats.pendingCount}</strong><span style={styles.statSub}>{peso(stats.pendingAmount)}</span></div>
      </div>

      <div style={styles.walletCard}>
        <h3 style={styles.walletTitle}>📱 Official Shelter E-Wallets</h3>
        <div style={styles.walletGrid}>
          <div style={styles.walletItem}><span style={styles.badgeGcash}>GCash</span><p style={styles.walletNum}>{eWalletDetails.gcashNumber}</p><p style={styles.walletName}>{eWalletDetails.gcashAccountName}</p></div>
          <div style={styles.walletItem}><span style={styles.badgeMaya}>Maya</span><p style={styles.walletNum}>{eWalletDetails.mayaNumber}</p><p style={styles.walletName}>{eWalletDetails.mayaAccountName}</p></div>
        </div>
      </div>

      <div style={styles.filterRow}>
        <div role="group" aria-label="Filter by status" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} style={{ ...styles.filterChip, ...(filter === f ? styles.filterChipOn : {}) }}>{f}</button>
          ))}
        </div>
        <input aria-label="Search donations" placeholder="Search donor or purpose" value={search} onChange={(e) => setSearch(e.target.value)} style={styles.search} />
      </div>

      {visible.length === 0 ? (
        <div style={styles.emptyState}>{donations.length === 0 ? "No donations recorded yet." : "No donations match this filter."}</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Donor</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Purpose / message</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => {
                const st = statusOf(d);
                return (
                  <tr key={d.id}>
                    <td style={styles.td}>{d.donorName || "Anonymous"}</td>
                    <td style={styles.td}>{peso(d.amount)}</td>
                    <td style={styles.td}>{d.paymentMethod || "E-Wallet"}</td>
                    <td style={styles.td}>{d.date || "-"}</td>
                    <td style={styles.td}>
                      {d.purpose || "General"}
                      {d.message && <div style={styles.msg}>“{d.message}”</div>}
                    </td>
                    <td style={styles.td}><span style={{ ...styles.chip, background: TONE[st]?.bg, color: TONE[st]?.fg }}>{st}</span></td>
                    <td style={styles.td}>
                      {st === "Pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" disabled={busyId === d.id} onClick={() => decide(d, "Received")} style={styles.confirmBtn}>Confirm</button>
                          <button type="button" disabled={busyId === d.id} onClick={() => decide(d, "Not received")} style={styles.rejectBtn}>Not received</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: "0 0 16px" }}>Record E-Wallet Payment</h3>
            {error && <div style={styles.errorBanner}>{error}</div>}
            <form onSubmit={handleAddDonation}>
              <label style={styles.label}>Donor Name</label>
              <input style={styles.input} placeholder="Leave blank for Anonymous" value={form.donorName} onChange={handleInputChange("donorName")} />
              <label style={styles.label}>Amount (₱)*</label>
              <input type="number" style={styles.input} placeholder="0.00" value={form.amount} onChange={handleInputChange("amount")} required />
              <label style={styles.label}>Purpose / Specific Pet</label>
              <input style={styles.input} placeholder="e.g., Food fund, Max's treatment" value={form.purpose} onChange={handleInputChange("purpose")} />
              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelButton} onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" style={styles.saveButton} disabled={saving}>{saving ? "Saving..." : "Save Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "30px" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: "22px" },
  subtitle: { margin: "4px 0 0", color: "#607d8b" },
  addButton: { background: "#2e7d32", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#2e7d32", border: "2px solid #2e7d32", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 },
  statCard: { display: "flex", flexDirection: "column", gap: 2, padding: 16, background: "#fff", borderRadius: 14, boxShadow: "0 4px 14px rgba(0,0,0,.06)" },
  statAlert: { background: "#fffbeb", border: "1px solid #fcd34d" },
  statLabel: { fontSize: 12, color: "#607d8b", textTransform: "uppercase", letterSpacing: "0.04em" },
  statValue: { fontSize: 24, color: "#1b5e20" },
  statSub: { fontSize: 12, color: "#90a4ae" },
  walletCard: { background: "#fff", padding: "20px", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,.06)", marginBottom: "24px" },
  walletTitle: { margin: "0 0 16px", fontSize: "16px", color: "#37474f" },
  walletGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" },
  walletItem: { padding: "14px", background: "#f8f9fa", borderRadius: "10px", border: "1px solid #eceff1" },
  badgeGcash: { background: "#007dfe", color: "#fff", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 },
  badgeMaya: { background: "#000", color: "#fff", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 },
  walletNum: { margin: "8px 0 2px", fontWeight: 700, fontSize: "16px" },
  walletName: { margin: 0, fontSize: "12px", color: "#607d8b" },
  filterRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  filterChip: { padding: "7px 16px", borderRadius: 999, border: "1px solid #cfd8dc", background: "#fff", color: "#37474f", fontWeight: 600, cursor: "pointer" },
  filterChipOn: { background: "#2e7d32", borderColor: "#2e7d32", color: "#fff" },
  search: { padding: "9px 14px", borderRadius: 999, border: "1px solid #cfd8dc", minWidth: 220 },
  emptyState: { padding: "40px", textAlign: "center", color: "#90a4ae", background: "#f8f9fa", borderRadius: "10px" },
  tableWrap: { background: "#fff", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,.06)", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#90a4ae", borderBottom: "2px solid #eceff1", whiteSpace: "nowrap" },
  td: { padding: "12px 16px", fontSize: "14px", borderBottom: "1px solid #eceff1", color: "#37474f", verticalAlign: "top" },
  msg: { marginTop: 4, fontSize: 12, color: "#607d8b" },
  chip: { padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  confirmBtn: { padding: "6px 12px", border: "none", borderRadius: 6, background: "#2e7d32", color: "#fff", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  rejectBtn: { padding: "6px 12px", border: "1px solid #b91c1c", borderRadius: 6, background: "#fff", color: "#b91c1c", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", padding: "24px", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" },
  label: { display: "block", fontSize: "12px", fontWeight: 600, color: "#546e7a", marginBottom: "4px" },
  input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cfd8dc", marginBottom: "14px", boxSizing: "border-box" },
  errorBanner: { padding: "8px 12px", background: "#fdecea", color: "#b3261e", borderRadius: "6px", fontSize: "13px", marginBottom: "12px" },
  modalActions: { display: "flex", gap: "10px", marginTop: "8px" },
  cancelButton: { flex: 1, padding: "10px", background: "#eceff1", border: "none", borderRadius: "6px", color: "#37474f", cursor: "pointer" },
  saveButton: { flex: 1, padding: "10px", background: "#2e7d32", border: "none", borderRadius: "6px", color: "#fff", fontWeight: 600, cursor: "pointer" },
};

export default Donations;