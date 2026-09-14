import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../Firebase";

function VetDashboard() {
  const [loading, setLoading] = useState(true);
  const [vetName, setVetName] = useState("");
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    totalRecords: 0,
  });
  const [todaysAppointments, setTodaysAppointments] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

 ` const loadDashboard = async () => {
    try {
      const currentUser = auth.currentUser;
      const today = new Date().toISOString().split("T")[0];

      const [petsSnap, appointmentsSnap, recordsSnap] = await Promise.all([
        getDocs(collection(db, "pets")),
        getDocs(collection(db, "appointments")),
        getDocs(collection(db, "medicalRecords")),
      ]);

      const appointments = appointmentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const pending = appointments.filter((a) => a.status === "pending");
      const today_list = appointments
        .filter((a) => a.date === today)
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

      setStats({
        totalPatients: petsSnap.size,
        totalAppointments: appointments.length,
        pendingAppointments: pending.length,
        totalRecords: recordsSnap.size,
      });
      setTodaysAppointments(today_list);

      if (currentUser) {
        setVetName(currentUser.displayName || "");
      }
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }`

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Welcome back{vetName ? `, ${vetName}` : ""} 👋</h2>
          <p style={styles.subtitle}>Here's what's happening today.</p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard icon="🐶" label="Total Patients" value={stats.totalPatients} />
        <StatCard icon="📅" label="Total Appointments" value={stats.totalAppointments} />
        <StatCard icon="⏳" label="Pending Appointments" value={stats.pendingAppointments} />
        <StatCard icon="📋" label="Medical Records" value={stats.totalRecords} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Today's Appointments</h3>

        {todaysAppointments.length === 0 ? (
          <div style={styles.emptyState}>No appointments scheduled for today.</div>
        ) : (
          <div style={styles.appointmentList}>
            {todaysAppointments.map((appt) => (
              <div key={appt.id} style={styles.appointmentCard}>
                <div>
                  <h4 style={styles.appointmentPet}>{appt.petName || "Unknown Pet"}</h4>
                  <p style={styles.appointmentMeta}>
                    {appt.ownerName ? `Owner: ${appt.ownerName}` : ""} {appt.reason ? `· ${appt.reason}` : ""}
                  </p>
                </div>
                <div style={styles.appointmentRight}>
                  <span style={styles.appointmentTime}>{appt.time || "-"}</span>
                  <StatusBadge status={appt.status} />
                </div>
              </div>
            ))}
          </div>
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
    pending: { bg: "#fff3e0", color: "#e65100" },
    confirmed: { bg: "#e8f5e9", color: "#2e7d32" },
    completed: { bg: "#e3f2fd", color: "#1565c0" },
    cancelled: { bg: "#fdecea", color: "#b3261e" },
  };
  const style = colors[status] || { bg: "#eceff1", color: "#546e7a" };

  return (
    <span
      style={{
        ...styles.badge,
        background: style.bg,
        color: style.color,
      }}
    >
      {status || "unknown"}
    </span>
  );
}

const styles = {
  container: {
    padding: "30px",
  },

  headerRow: {
    marginBottom: "24px",
  },

  title: {
    margin: 0,
    fontSize: "24px",
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#607d8b",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
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

  statIcon: {
    fontSize: "28px",
  },

  statValue: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
  },

  statLabel: {
    margin: "2px 0 0",
    fontSize: "13px",
    color: "#607d8b",
  },

  section: {
    background: "#fff",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
  },

  sectionTitle: {
    margin: "0 0 16px",
    fontSize: "18px",
  },

  emptyState: {
    padding: "24px",
    textAlign: "center",
    color: "#90a4ae",
    background: "#f8f9fa",
    borderRadius: "10px",
  },

  appointmentList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  appointmentCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    background: "#f8f9fa",
    borderRadius: "10px",
  },

  appointmentPet: {
    margin: 0,
    fontSize: "15px",
  },

  appointmentMeta: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#607d8b",
  },

  appointmentRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  appointmentTime: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#2e7d32",
  },

  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
  },
};

export default VetDashboard;