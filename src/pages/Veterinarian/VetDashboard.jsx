import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase";

function Dashboard() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    pendingRequests: 0,
    totalPatients: 0,
    medicalRecords: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const vetUid = currentUser.uid;
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Listen to Appointments
    const apptQuery = query(
      collection(db, "appointments"),
      where("vetId", "==", vetUid)
    );

    const unsubAppts = onSnapshot(apptQuery, (snapshot) => {
      const appts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const total = appts.length;
      const todayCount = appts.filter((a) => a.date === todayStr).length;
      const pendingCount = appts.filter((a) => a.status === "pending").length;

      // Get next 5 upcoming / pending appointments
      const sortedRecent = [...appts]
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        .slice(0, 5);

      setRecentAppointments(sortedRecent);
      setStats((prev) => ({
        ...prev,
        totalAppointments: total,
        todayAppointments: todayCount,
        pendingRequests: pendingCount,
      }));
    });

    // 2. Listen to Patients/Pets
    const petsQuery = query(collection(db, "pets"));
    const unsubPets = onSnapshot(petsQuery, (snapshot) => {
      setStats((prev) => ({ ...prev, totalPatients: snapshot.size }));
    });

    // 3. Listen to Medical Records
    const recordsQuery = query(
      collection(db, "medicalRecords"),
      where("postedBy", "==", vetUid)
    );
    const unsubRecords = onSnapshot(recordsQuery, (snapshot) => {
      setStats((prev) => ({ ...prev, medicalRecords: snapshot.size }));
      setLoading(false);
    });

    return () => {
      unsubAppts();
      unsubPets();
      unsubRecords();
    };
  }, []);

  if (loading) {
    return <h2 style={{ textAlign: "center", margin: "40px 0" }}>Loading Dashboard...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>📌 Vet Overview Dashboard</h2>

      {/* KPI Cards Grid */}
      <div style={styles.cardGrid}>
        <div style={styles.statCard}>
          <h3>🗓️ Total Appointments</h3>
          <p style={styles.statNumber}>{stats.totalAppointments}</p>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: "#1565c0" }}>
          <h3>⏰ Today's Schedule</h3>
          <p style={styles.statNumber}>{stats.todayAppointments}</p>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: "#e65100" }}>
          <h3>🔔 Pending Requests</h3>
          <p style={styles.statNumber}>{stats.pendingRequests}</p>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: "#7b1fa2" }}>
          <h3>🐾 Registered Patients</h3>
          <p style={styles.statNumber}>{stats.totalPatients}</p>
        </div>
      </div>

      {/* Recent Appointments Preview */}
      <div style={styles.section}>
        <h3>📋 Upcoming Appointments</h3>
        {recentAppointments.length === 0 ? (
          <p style={styles.mutedText}>No upcoming appointments scheduled.</p>
        ) : (
          <div style={styles.list}>
            {recentAppointments.map((appt) => (
              <div key={appt.id} style={styles.recentItem}>
                <div>
                  <strong>{appt.petName || "Pet"}</strong> ({appt.ownerName || "Owner"})
                  <div style={styles.subText}>
                    📅 {appt.date || "N/A"} at ⏰ {appt.time || "N/A"}
                  </div>
                </div>
                <span
                  style={{
                    ...styles.badge,
                    background: appt.status === "pending" ? "#fff3e0" : "#e8f5e9",
                    color: appt.status === "pending" ? "#e65100" : "#2e7d32",
                  }}
                >
                  {appt.status || "pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
  },
  heading: {
    marginBottom: "20px",
    color: "#263238",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  statCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    borderLeft: "5px solid #2e7d32",
  },
  statNumber: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "10px 0 0",
    color: "#263238",
  },
  section: {
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
  },
  mutedText: {
    color: "#90a4ae",
    marginTop: "10px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "15px",
  },
  recentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  subText: {
    fontSize: "13px",
    color: "#607d8b",
    marginTop: "4px",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
  },
};

export default Dashboard;
