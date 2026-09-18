import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../Firebase";

function Donations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // E-Wallet payment details (can also be saved to/loaded from user profile)
  const eWalletDetails = {
    gcashNumber: "0917-XXX-XXXX",
    gcashAccountName: "Shelter GCash Account",
    mayaNumber: "0917-XXX-XXXX",
    mayaAccountName: "Shelter Maya Account",
  };

  const [form, setForm] = useState({
    donorName: "",
    amount: "",
    purpose: "General Support",
    notes: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const donationsQuery = query(
          collection(db, "donations"),
          where("shelterId", "==", currentUser.uid)
        );
        const snapshot = await getDocs(donationsQuery);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        data.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0);
          return dateB - dateA;
        });

        setDonations(data);
      } catch (err) {
        console.error("Error loading donations:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

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
      const newDonation = {
        shelterId: currentUser.uid,
        donorName: form.donorName.trim() || "Anonymous",
        amount: Number(form.amount),
        purpose: form.purpose.trim() || "General",
        paymentMethod: "E-Wallet",
        notes: form.notes.trim(),
        date: new Date().toISOString().split("T")[0],
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "donations"), newDonation);

      setDonations((prev) => [{ id: docRef.id, ...newDonation }, ...prev]);
      setShowModal(false);
      setForm({ donorName: "", amount: "", purpose: "General Support", notes: "" });
    } catch (err) {
      console.error("Failed to record donation:", err);
      setError("Failed to save donation record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const total = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  if (loading) {
    return <h2 style={{ textAlign: "center", marginTop: "40px" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>💰 E-Wallet & Donations</h2>
          <p style={styles.subtitle}>
            {donations.length} donation{donations.length !== 1 ? "s" : ""} · ₱
            {total.toLocaleString()} received
          </p>
        </div>
        <button style={styles.addButton} onClick={() => setShowModal(true)}>
          + Log E-Wallet Payment
        </button>
      </div>

      {/* E-Wallet Info Box */}
      <div style={styles.walletCard}>
        <h3 style={styles.walletTitle}>📱 Official Shelter E-Wallets</h3>
        <div style={styles.walletGrid}>
          <div style={styles.walletItem}>
            <span style={styles.badgeGcash}>GCash</span>
            <p style={styles.walletNum}>{eWalletDetails.gcashNumber}</p>
            <p style={styles.walletName}>{eWalletDetails.gcashAccountName}</p>
          </div>
          <div style={styles.walletItem}>
            <span style={styles.badgeMaya}>Maya</span>
            <p style={styles.walletNum}>{eWalletDetails.mayaNumber}</p>
            <p style={styles.walletName}>{eWalletDetails.mayaAccountName}</p>
          </div>
        </div>
      </div>

      {donations.length === 0 ? (
        <div style={styles.emptyState}>No E-Wallet donations recorded yet.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Donor</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id}>
                  <td style={styles.td}>{d.donorName || "Anonymous"}</td>
                  <td style={styles.td}>₱{Number(d.amount || 0).toLocaleString()}</td>
                  <td style={styles.td}>{d.paymentMethod || "E-Wallet"}</td>
                  <td style={styles.td}>{d.date || "-"}</td>
                  <td style={styles.td}>{d.purpose || "General"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Entry Modal for received payments */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: "0 0 16px" }}>Record E-Wallet Payment</h3>
            {error && <div style={styles.errorBanner}>{error}</div>}

            <form onSubmit={handleAddDonation}>
              <label style={styles.label}>Donor Name</label>
              <input
                style={styles.input}
                placeholder="Leave blank for Anonymous"
                value={form.donorName}
                onChange={handleInputChange("donorName")}
              />

              <label style={styles.label}>Amount (₱)*</label>
              <input
                type="number"
                style={styles.input}
                placeholder="0.00"
                value={form.amount}
                onChange={handleInputChange("amount")}
                required
              />

              <label style={styles.label}>Purpose / Specific Pet</label>
              <input
                style={styles.input}
                placeholder="e.g., Food fund, Max's treatment"
                value={form.purpose}
                onChange={handleInputChange("purpose")}
              />

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveButton} disabled={saving}>
                  {saving ? "Saving..." : "Save Record"}
                </button>
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: { margin: 0, fontSize: "22px" },
  subtitle: { margin: "4px 0 0", color: "#607d8b" },
  addButton: {
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },
  walletCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    marginBottom: "24px",
  },
  walletTitle: { margin: "0 0 16px", fontSize: "16px", color: "#37474f" },
  walletGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  walletItem: {
    padding: "14px",
    background: "#f8f9fa",
    borderRadius: "10px",
    border: "1px solid #eceff1",
  },
  badgeGcash: {
    background: "#007dfe",
    color: "#fff",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
  },
  badgeMaya: {
    background: "#000",
    color: "#fff",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
  },
  walletNum: { margin: "8px 0 2px", fontWeight: 700, fontSize: "16px" },
  walletName: { margin: 0, fontSize: "12px", color: "#607d8b" },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#90a4ae",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  tableWrap: {
    background: "#fff",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    overflowX: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#90a4ae",
    borderBottom: "2px solid #eceff1",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    fontSize: "14px",
    borderBottom: "1px solid #eceff1",
    color: "#37474f",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: "24px",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#546e7a",
    marginBottom: "4px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #cfd8dc",
    marginBottom: "14px",
    boxSizing: "border-box",
  },
  errorBanner: {
    padding: "8px 12px",
    background: "#fdecea",
    color: "#b3261e",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "12px",
  },
  modalActions: { display: "flex", gap: "10px", marginTop: "8px" },
  cancelButton: {
    flex: 1,
    padding: "10px",
    background: "#eceff1",
    border: "none",
    borderRadius: "6px",
    color: "#37474f",
    cursor: "pointer",
  },
  saveButton: {
    flex: 1,
    padding: "10px",
    background: "#2e7d32",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default Donations;