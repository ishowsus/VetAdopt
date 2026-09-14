import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../Firebase";

function Donations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const donationsQuery = query(
        collection(db, "donations"),
        where("shelterId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(donationsQuery);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setDonations(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const total = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>💰 Donations</h2>
      <p style={styles.subtitle}>
        {donations.length} donation{donations.length !== 1 ? "s" : ""} · ₱
        {total.toLocaleString()} received
      </p>

      {donations.length === 0 ? (
        <div style={styles.emptyState}>No donations received yet.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Donor</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id}>
                  <td style={styles.td}>{d.donorName || "Anonymous"}</td>
                  <td style={styles.td}>₱{Number(d.amount || 0).toLocaleString()}</td>
                  <td style={styles.td}>{d.date || "-"}</td>
                  <td style={styles.td}>{d.purpose || "General"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
  },

  title: {
    margin: 0,
    fontSize: "22px",
  },

  subtitle: {
    margin: "4px 0 20px",
    color: "#607d8b",
  },

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

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

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
};

export default Donations;