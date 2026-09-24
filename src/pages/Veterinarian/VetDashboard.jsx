import { useMemo } from "react";
import {
  useVetAppointments,
  buildPatients,
  todayString,
  timeToMinutes,
  formatDate,
  STATUS_COLORS,
} from "./vetHelpers";

function Dashboard() {
  const { appointments, loading, error, user } = useVetAppointments();

  const { stats, upcoming } = useMemo(() => {
    const today = todayString();
    const active = appointments.filter((a) => a.status !== "cancelled");

    const stats = {
      registeredPatients: buildPatients(appointments).length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      pending: appointments.filter((a) => a.status === "pending").length,
      today: active.filter((a) => a.date === today).length,
      total: appointments.length,
    };

    // Next 5 pending / confirmed visits from today onward
    const upcoming = appointments
      .filter(
        (a) =>
          (a.status === "pending" || a.status === "confirmed") &&
          (a.date || "") >= today
      )
      .sort(
        (a, b) =>
          (a.date || "").localeCompare(b.date || "") ||
          timeToMinutes(a.time) - timeToMinutes(b.time)
      )
      .slice(0, 5);

    return { stats, upcoming };
  }, [appointments]);

  if (loading) {
    return <h2 style={{ textAlign: "center", margin: "40px 0" }}>Loading Dashboard...</h2>;
  }

  if (!user) {
    return <h2 style={{ textAlign: "center", margin: "40px 0" }}>Please log in to view your dashboard.</h2>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>📌 Vet Overview Dashboard</h2>

      {error && <div style={styles.error}>Couldn't load appointments: {error}</div>}

      <div style={styles.cardGrid}>
        <div style={styles.statCard}>
          <h3>🐾 Registered Patients</h3>
          <p style={styles.statNumber}>{stats.registeredPatients}</p>
          <p style={styles.statHint}>Pets booked with you</p>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: "#1565c0" }}>
          <h3>✅ Confirmed Appointments</h3>
          <p style={styles.statNumber}>{stats.confirmed}</p>
          <p style={styles.statHint}>Accepted by you</p>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: "#e65100" }}>
          <h3>🔔 Pending Requests</h3>
          <p style={styles.statNumber}>{stats.pending}</p>
          <p style={styles.statHint}>Waiting for your reply</p>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: "#7b1fa2" }}>
          <h3>⏰ Today's Schedule</h3>
          <p style={styles.statNumber}>{stats.today}</p>
          <p style={styles.statHint}>{stats.total} appointments in total</p>
        </div>
      </div>

      <div style={styles.section}>
        <h3>📋 Upcoming Appointments</h3>
        {upcoming.length === 0 ? (
          <p style={styles.mutedText}>No upcoming appointments scheduled.</p>
        ) : (
          <div style={styles.list}>
            {upcoming.map((appt) => {
              const c = STATUS_COLORS[appt.status] || STATUS_COLORS.pending;
              return (
                <div key={appt.id} style={styles.recentItem}>
                  <div>
                    <strong>{appt.petName || "Pet"}</strong> ({appt.ownerName || "Owner"})
                    <div style={styles.subText}>
                      📅 {formatDate(appt.date)} at ⏰ {appt.time || "N/A"}
                      {appt.service && ` · ${appt.service}`}
                    </div>
                  </div>
                  <span style={{ ...styles.badge, background: c.bg, color: c.color }}>
                    {appt.status || "pending"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "30px" },
  heading: { marginBottom: "20px", color: "#263238" },
  error: {
    background: "#fdecea",
    color: "#b3261e",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
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
  statHint: { fontSize: "12px", color: "#90a4ae", margin: "4px 0 0" },
  section: {
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
  },
  mutedText: { color: "#90a4ae", marginTop: "10px" },
  list: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" },
  recentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  subText: { fontSize: "13px", color: "#607d8b", marginTop: "4px" },
  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
  },
};

export default Dashboard;