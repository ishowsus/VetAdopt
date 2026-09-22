import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";

// Firestore serverTimestamp() fields come back as Timestamp objects (with a
// .toDate() method), not strings - new Date(timestamp) on one of those gives
// "Invalid Date". This normalizes any of the shapes we might see.
function toJsDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function ShelterDashboard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stats, setStats] = useState({
    totalPets: 0,
    availablePets: 0,
    pendingAdoptions: 0,
    successfulAdoptions: 0,
    donationsReceived: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentPets, setRecentPets] = useState([]);

  useEffect(() => {
    // 1. Wrap in onAuthStateChanged to prevent race conditions on page refresh
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoadError("");
      try {
        // Firestore can't OR across two different fields in one query, so a pet
        // "posted by this shelter" is fetched as the union of two queries:
        // docs where this user is the poster, and docs tagged with this shelter's id.
        // NOTE: assumes pet docs may carry a "shelterId" field distinct from
        // "postedBy" - if your schema only ever uses one of these fields, the
        // second query is a harmless no-op.
        const petsByPosterQuery = query(
          collection(db, "pets"),
          where("postedBy", "==", currentUser.uid)
        );
        const petsByShelterQuery = query(
          collection(db, "pets"),
          where("shelterId", "==", currentUser.uid)
        );

        // 2. Updated target collection name to 'applications' matching Firestore Rules
        const requestsQuery = query(
          collection(db, "applications"),
          where("ownerId", "==", currentUser.uid)
        );

        const donationsQuery = query(
          collection(db, "donations"),
          where("shelterId", "==", currentUser.uid)
        );

        const [petsByPosterSnap, petsByShelterSnap, requestsSnap, donationsSnap] = await Promise.all([
          getDocs(petsByPosterQuery),
          getDocs(petsByShelterQuery),
          getDocs(requestsQuery),
          getDocs(donationsQuery),
        ]);

        const petsById = new Map();
        for (const d of [...petsByPosterSnap.docs, ...petsByShelterSnap.docs]) {
          petsById.set(d.id, { id: d.id, ...d.data() });
        }
        const pets = Array.from(petsById.values());
        const requests = requestsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const donations = donationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const available = pets.filter((p) => p.status === "Available").length;
        const adopted = pets.filter((p) => p.status === "Adopted").length;
        const pending = requests.filter((r) => r.status === "Pending").length;
        const donationsTotal = donations.reduce(
          (sum, d) => sum + (Number(d.amount) || 0),
          0
        );

        // Safe Date Sorting (handles Firestore Timestamp objects, date strings, and missing dates)
        const sortedRequests = [...requests].sort(
          (a, b) =>
            (toJsDate(b.createdAt || b.date)?.getTime() || 0) -
            (toJsDate(a.createdAt || a.date)?.getTime() || 0)
        );
        const sortedPets = [...pets].sort(
          (a, b) => (toJsDate(b.createdAt)?.getTime() || 0) - (toJsDate(a.createdAt)?.getTime() || 0)
        );

        setStats({
          totalPets: pets.length,
          availablePets: available,
          pendingAdoptions: pending,
          successfulAdoptions: adopted,
          donationsReceived: donationsTotal,
        });
        setRecentRequests(sortedRequests.slice(0, 5));
        setRecentPets(sortedPets.slice(0, 5));
      } catch (error) {
        console.error("Dashboard Loading Error:", error);
        setLoadError("We couldn't load your dashboard data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <h2 style={{ textAlign: "center", marginTop: "40px" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏠 Shelter Dashboard</h2>
      <p style={styles.subtitle}>Here's an overview of your shelter.</p>

      {loadError && <div style={styles.errorBanner}>{loadError}</div>}

      <div style={styles.statsGrid}>
        <StatCard icon="🐾" label="Total Pets" value={stats.totalPets} />
        <StatCard icon="🏡" label="Available Pets" value={stats.availablePets} />
        <StatCard icon="📄" label="Pending Adoptions" value={stats.pendingAdoptions} />
        <StatCard icon="❤️" label="Successful Adoptions" value={stats.successfulAdoptions} />
        <StatCard
          icon="💰"
          label="Donations Received"
          value={`₱${stats.donationsReceived.toLocaleString()}`}
        />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Adoption Requests</h3>
        {recentRequests.length === 0 ? (
          <div style={styles.emptyState}>No adoption requests yet.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Applicant</th>
                <th style={styles.th}>Pet</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>{r.applicantName || "Unknown"}</td>
                  <td style={styles.td}>{r.petName || "Unknown"}</td>
                  <td style={styles.td}>
                    {toJsDate(r.createdAt)?.toLocaleDateString() || "-"}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recently Added Pets</h3>
        {recentPets.length === 0 ? (
          <div style={styles.emptyState}>No pets added yet.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Pet</th>
                <th style={styles.th}>Breed</th>
                <th style={styles.th}>Date Added</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPets.map((p) => (
                <tr key={p.id}>
                  <td style={styles.td}>{p.name || "Unnamed"}</td>
                  <td style={styles.td}>{p.breed || "-"}</td>
                  <td style={styles.td}>
                    {toJsDate(p.createdAt)?.toLocaleDateString() || "-"}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statIcon}>{icon}</span>
      <div>
        <p style={styles.statValue}>{value}</p>
        <p style={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Pending: { bg: "#fff3e0", color: "#e65100" },
    Approved: { bg: "#e8f5e9", color: "#2e7d32" },
    Rejected: { bg: "#fdecea", color: "#b3261e" },
    Available: { bg: "#e8f5e9", color: "#2e7d32" },
    Adopted: { bg: "#e3f2fd", color: "#1565c0" },
    Pending_Vet: { bg: "#fff3e0", color: "#e65100" },
  };
  const style = colors[status] || { bg: "#eceff1", color: "#546e7a" };

  return (
    <span style={{ ...styles.badge, background: style.bg, color: style.color }}>
      {status || "Unknown"}
    </span>
  );
}

const styles = {
  container: { padding: "30px" },
  title: { margin: 0, fontSize: "24px" },
  subtitle: { margin: "4px 0 24px", color: "#607d8b" },
  errorBanner: {
    background: "#fdecea",
    color: "#b3261e",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    borderLeft: "5px solid #2e7d32",
  },
  statIcon: { fontSize: "26px" },
  statValue: { margin: 0, fontSize: "20px", fontWeight: 700 },
  statLabel: { margin: "2px 0 0", fontSize: "13px", color: "#607d8b" },
  section: {
    background: "#fff",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    marginBottom: "24px",
  },
  sectionTitle: { margin: "0 0 16px", fontSize: "18px" },
  emptyState: {
    padding: "24px",
    textAlign: "center",
    color: "#90a4ae",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#90a4ae",
    borderBottom: "2px solid #eceff1",
  },
  td: {
    padding: "12px",
    fontSize: "14px",
    borderBottom: "1px solid #eceff1",
    color: "#37474f",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
  },
};

export default ShelterDashboard;
