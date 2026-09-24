import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useVetAppointments, formatDate, STATUS_COLORS } from "./vetHelpers";

const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];

function Appointment() {
  const { appointments, loading, error, user } = useVetAppointments();
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState("");

  // The list refreshes by itself (live listener), so we only need to write.
  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    setActionError("");
    try {
      await updateDoc(doc(db, "appointments", id), { status });
    } catch (err) {
      console.error(err);
      setActionError("Couldn't update this appointment. Please try again.");
    }
    setUpdatingId(null);
  };

  const countFor = (f) =>
    f === "all" ? appointments.length : appointments.filter((a) => a.status === f).length;

  const visible =
    filter === "all" ? appointments : appointments.filter((a) => a.status === filter);

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>Please log in to view your appointments.</h2>;
  }

  return (
    <div style={styles.container}>
      <h2>📅 Appointments</h2>
      <p style={styles.count}>Total Appointments: {appointments.length}</p>

      {(error || actionError) && <div style={styles.error}>{actionError || error}</div>}

      <div style={styles.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterButton,
              ...(filter === f ? styles.filterButtonActive : {}),
            }}
          >
            {f} ({countFor(f)})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={styles.emptyState}>
          {appointments.length === 0
            ? `No appointments yet. When an adopter books with you, it will appear here. (Signed in as vet ID: ${user.uid})`
            : "No appointments match this filter."}
        </div>
      ) : (
        <div style={styles.list}>
          {visible.map((appt) => (
            <div key={appt.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h4 style={styles.petName}>{appt.petName || "Unknown Pet"}</h4>
                  {appt.ownerName && <p style={styles.meta}>Owner: {appt.ownerName}</p>}
                </div>
                <StatusBadge status={appt.status} />
              </div>

              <div style={styles.details}>
                <span>📆 {formatDate(appt.date)}</span>
                <span>🕐 {appt.time || "No time"}</span>
                {(appt.service || appt.reason) && <span>🏷️ {appt.service || appt.reason}</span>}
              </div>

              {appt.notes && <p style={styles.notes}>"{appt.notes}"</p>}

              <div style={styles.actions}>
                {appt.status === "pending" && (
                  <button
                    style={styles.confirmButton}
                    disabled={updatingId === appt.id}
                    onClick={() => updateStatus(appt.id, "confirmed")}
                  >
                    Confirm
                  </button>
                )}
                {(appt.status === "pending" || appt.status === "confirmed") && (
                  <button
                    style={styles.completeButton}
                    disabled={updatingId === appt.id}
                    onClick={() => updateStatus(appt.id, "completed")}
                  >
                    Mark Completed
                  </button>
                )}
                {(appt.status === "pending" || appt.status === "confirmed") && (
                  <button
                    style={styles.cancelButton}
                    disabled={updatingId === appt.id}
                    onClick={() => updateStatus(appt.id, "cancelled")}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "#eceff1", color: "#546e7a" };
  return (
    <span style={{ ...styles.badge, background: c.bg, color: c.color }}>
      {status || "unknown"}
    </span>
  );
}

const styles = {
  container: { padding: "30px" },
  count: { color: "#607d8b", marginBottom: "16px" },
  error: {
    background: "#fdecea",
    color: "#b3261e",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  filterRow: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  filterButton: {
    padding: "8px 16px",
    borderRadius: "999px",
    border: "1px solid #cfd8dc",
    background: "#fff",
    color: "#546e7a",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    textTransform: "capitalize",
  },
  filterButtonActive: { background: "#2e7d32", border: "1px solid #2e7d32", color: "#fff" },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#90a4ae",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  list: { display: "flex", flexDirection: "column", gap: "14px" },
  card: {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    borderLeft: "5px solid #2e7d32",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
  },
  petName: { margin: 0, fontSize: "16px" },
  meta: { margin: "4px 0 0", fontSize: "13px", color: "#607d8b" },
  details: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    fontSize: "14px",
    color: "#455a64",
    marginBottom: "10px",
  },
  notes: { margin: "0 0 14px", fontSize: "13px", color: "#607d8b", fontStyle: "italic" },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  confirmButton: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    background: "#2e7d32",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  completeButton: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #1565c0",
    background: "#fff",
    color: "#1565c0",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  cancelButton: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #b3261e",
    background: "#fff",
    color: "#b3261e",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
};

export default Appointment;