import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { auth, db } from "../../Firebase";

const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];

function Appointment() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Listen to real-time appointment updates for the logged-in vet
    const q = query(
      collection(db, "appointments"),
      where("vetId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort by date and time
        data.sort((a, b) => {
          const dateCompare = (a.date || "").localeCompare(b.date || "");
          if (dateCompare !== 0) return dateCompare;
          return (a.time || "").localeCompare(b.time || "");
        });

        setAppointments(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching appointments:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "appointments", id), { status });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
    setUpdatingId(null);
  };

  const visibleAppointments =
    filter === "all"
      ? appointments
      : appointments.filter((appt) => appt.status === filter);

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading appointments...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2>📅 Appointments & Booking Requests</h2>
      <p style={styles.count}>Total Appointments: {appointments.length}</p>

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
            {f}
          </button>
        ))}
      </div>

      {visibleAppointments.length === 0 ? (
        <div style={styles.emptyState}>No appointment requests found for this filter.</div>
      ) : (
        <div style={styles.list}>
          {visibleAppointments.map((appt) => (
            <div key={appt.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h4 style={styles.petName}>
                    🐾 {appt.petName || "Unknown Pet"} {appt.petBreed && `(${appt.petBreed})`}
                  </h4>
                  <p style={styles.meta}>
                    👤 {appt.ownerName || appt.userName || "Pet Owner"} 
                    {appt.ownerPhone ? ` • 📞 ${appt.ownerPhone}` : ""}
                  </p>
                </div>
                <StatusBadge status={appt.status || "pending"} />
              </div>

              <div style={styles.details}>
                <span>📅 {appt.date || "No date set"}</span>
                <span>⏰ {appt.time || "No time slot"}</span>
                {appt.reason && <span>📝 Reason: {appt.reason}</span>}
              </div>

              <div style={styles.actions}>
                {appt.status === "pending" && (
                  <button
                    style={styles.confirmButton}
                    disabled={updatingId === appt.id}
                    onClick={() => updateStatus(appt.id, "confirmed")}
                  >
                    Confirm Booking
                  </button>
                )}
                {appt.status !== "completed" && appt.status !== "cancelled" && (
                  <button
                    style={styles.completeButton}
                    disabled={updatingId === appt.id}
                    onClick={() => updateStatus(appt.id, "completed")}
                  >
                    Mark Completed
                  </button>
                )}
                {appt.status !== "cancelled" && appt.status !== "completed" && (
                  <button
                    style={styles.cancelButton}
                    disabled={updatingId === appt.id}
                    onClick={() => updateStatus(appt.id, "cancelled")}
                  >
                    Decline / Cancel
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
      {status}
    </span>
  );
}

const styles = {
  container: {
    padding: "30px",
  },
  count: {
    color: "#607d8b",
    marginBottom: "16px",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
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
  filterButtonActive: {
    background: "#2e7d32",
    borderColor: "#2e7d32",
    color: "#fff",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#90a4ae",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
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
  petName: {
    margin: 0,
    fontSize: "16px",
  },
  meta: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#607d8b",
  },
  details: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    fontSize: "14px",
    color: "#455a64",
    marginBottom: "14px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
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