import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";

function AdoptionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Resolve Auth state reliably
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const requestsQuery = query(
          collection(db, "adoptionRequests"),
          where("shelterId", "==", currentUser.uid)
        );
        const snapshot = await getDocs(requestsQuery);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        // 2. Safely parse & sort dates
        data.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0);
          return dateB - dateA;
        });

        setRequests(data);
      } catch (err) {
        console.error("Error loading requests:", err);
        setError("Couldn't load adoption requests. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const decide = async (request, decision) => {
    setUpdatingId(request.id);
    setError("");

    try {
      const batch = writeBatch(db);

      // Update current request status
      const requestRef = doc(db, "adoptionRequests", request.id);
      batch.update(requestRef, { status: decision });

      if (decision === "Approved" && request.petId) {
        // Update Pet status to Adopted
        const petRef = doc(db, "pets", request.petId);
        batch.update(petRef, { status: "Adopted" });

        // Auto-reject other pending requests for this specific pet
        const otherPendingQuery = query(
          collection(db, "adoptionRequests"),
          where("petId", "==", request.petId),
          where("status", "==", "Pending")
        );
        const otherDocs = await getDocs(otherPendingQuery);
        otherDocs.forEach((d) => {
          if (d.id !== request.id) {
            batch.update(doc(db, "adoptionRequests", d.id), { status: "Rejected" });
          }
        });
      }

      await batch.commit();

      // Update local state cleanly
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === request.id) return { ...r, status: decision };
          if (decision === "Approved" && r.petId === request.petId && r.status === "Pending") {
            return { ...r, status: "Rejected" };
          }
          return r;
        })
      );
    } catch (err) {
      console.error("Error deciding request:", err);
      setError("Couldn't update this request. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <h2 style={{ textAlign: "center", marginTop: "40px" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📄 Adoption Requests</h2>
      <p style={styles.subtitle}>Total Requests: {requests.length}</p>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {requests.length === 0 ? (
        <div style={styles.emptyState}>No adoption requests yet.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Applicant</th>
                <th style={styles.th}>Pet</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <React.Fragment key={r.id}>
                  <tr>
                    <td style={styles.td}>{r.applicantName || "Unknown"}</td>
                    <td style={styles.td}>{r.petName || "Unknown"}</td>
                    <td style={styles.td}>{r.date || "-"}</td>
                    <td style={styles.td}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => setViewingId(viewingId === r.id ? null : r.id)}
                        >
                          {viewingId === r.id ? "Close" : "View"}
                        </button>
                        {r.status !== "Approved" && (
                          <button
                            style={styles.approveButton}
                            disabled={updatingId === r.id}
                            onClick={() => decide(r, "Approved")}
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== "Rejected" && (
                          <button
                            style={styles.rejectButton}
                            disabled={updatingId === r.id}
                            onClick={() => decide(r, "Rejected")}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {viewingId === r.id && (
                    <tr>
                      <td style={styles.detailCell} colSpan={5}>
                        <p style={{ margin: "0 0 4px" }}>
                          <strong>Email:</strong> {r.applicantEmail || "Not provided"}
                        </p>
                        <p style={{ margin: "0 0 4px" }}>
                          <strong>Phone:</strong> {r.applicantPhone || "Not provided"}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Message:</strong> {r.message || "No message provided."}
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Pending: { bg: "#fff3e0", color: "#e65100" },
    Approved: { bg: "#e8f5e9", color: "#2e7d32" },
    Rejected: { bg: "#fdecea", color: "#b3261e" },
  };
  const style = colors[status] || { bg: "#eceff1", color: "#546e7a" };

  return (
    <span style={{ ...styles.badge, background: style.bg, color: style.color }}>
      {status || "Pending"}
    </span>
  );
}

const styles = {
  container: { padding: "30px" },
  title: { margin: 0, fontSize: "22px" },
  subtitle: { margin: "4px 0 20px", color: "#607d8b" },
  errorBanner: {
    padding: "12px 16px",
    background: "#fdecea",
    color: "#b3261e",
    borderRadius: "10px",
    fontSize: "14px",
    marginBottom: "16px",
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
  detailCell: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#546e7a",
    background: "#f8f9fa",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
  },
  actions: { display: "flex", gap: "6px", flexWrap: "wrap" },
  actionButton: {
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 600,
    background: "#eef5ef",
    color: "#2e7d32",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  approveButton: {
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 600,
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  rejectButton: {
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 600,
    background: "#fdecea",
    color: "#b3261e",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};

export default AdoptionRequests;
