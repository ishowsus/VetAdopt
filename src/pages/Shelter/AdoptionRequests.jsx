import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";

const FILTERS = ["All", "Pending", "Approved", "Rejected"];

// Firestore serverTimestamp() comes back as a Timestamp object (or null for a
// moment right after it's written), so normalize before formatting/sorting.
function toJsDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const formatDate = (value) =>
  toJsDate(value)?.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) || "-";

function AdoptionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  // Live list of applications for pets posted by this shelter. The Adopt page
  // saves the pet's poster as `postedBy` on every application.
  useEffect(() => {
    let unsubSnap = null;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubSnap) {
        unsubSnap();
        unsubSnap = null;
      }
      if (!currentUser) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "applications"),
        where("postedBy", "==", currentUser.uid)
      );

      unsubSnap = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          data.sort(
            (a, b) =>
              (toJsDate(b.createdAt)?.getTime() || Date.now()) -
              (toJsDate(a.createdAt)?.getTime() || Date.now())
          );
          setRequests(data);
          setError("");
          setLoading(false);
        },
        (err) => {
          console.error("Error loading requests:", err);
          setError("Couldn't load adoption requests. Please try again.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  const counts = useMemo(() => {
    const c = { All: requests.length, Pending: 0, Approved: 0, Rejected: 0 };
    requests.forEach((r) => {
      const s = r.status || "Pending";
      if (c[s] !== undefined) c[s] += 1;
    });
    return c;
  }, [requests]);

  const visible =
    filter === "All"
      ? requests
      : requests.filter((r) => (r.status || "Pending") === filter);

  // A pet can only go to one applicant.
  const petAlreadyAdopted = (r) =>
    requests.some((o) => o.id !== r.id && o.petId === r.petId && o.status === "Approved");

  const decide = async (request, decision) => {
    setUpdatingId(request.id);
    setError("");

    try {
      const batch = writeBatch(db);
      const notify = (userId, text) => {
        if (!userId) return;
        batch.set(doc(collection(db, "notifications")), {
          userId,
          text,
          type: "adoption_decision",
          petId: request.petId || null,
          read: false,
          createdAt: serverTimestamp(),
        });
      };

      batch.update(doc(db, "applications", request.id), { status: decision });

      if (decision === "Approved" && request.petId) {
        // The pet is taken: hide it from the Adopt page.
        batch.update(doc(db, "pets", request.petId), { status: "Adopted" });
        notify(
          request.userId,
          `🎉 Your adoption application for ${request.petName} was approved!`
        );

        // Auto-reject everyone else still waiting on this pet.
        const others = await getDocs(
          query(
            collection(db, "applications"),
            where("petId", "==", request.petId),
            where("postedBy", "==", request.postedBy),
            where("status", "==", "Pending")
          )
        );
        others.forEach((d) => {
          if (d.id === request.id) return;
          batch.update(doc(db, "applications", d.id), { status: "Rejected" });
          notify(
            d.data().userId,
            `${request.petName} has found a home, so your application wasn't approved.`
          );
        });
      }

      if (decision === "Rejected") {
        // Undoing an approval puts the pet back on the Adopt page.
        if (request.status === "Approved" && request.petId) {
          batch.update(doc(db, "pets", request.petId), { status: "Available" });
        }
        notify(
          request.userId,
          `Your adoption application for ${request.petName} was not approved.`
        );
      }

      await batch.commit();
      // No manual state update needed: the live listener refreshes the list.
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
      <p style={styles.subtitle}>
        Total Requests: {requests.length} · Waiting for your decision: {counts.Pending}
      </p>

      {error && <div style={styles.errorBanner}>{error}</div>}

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
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={styles.emptyState}>
          {requests.length === 0
            ? "No adoption requests yet. When an adopter applies for one of your pets, they will appear here."
            : `No ${filter.toLowerCase()} requests.`}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Applicant</th>
                <th style={styles.th}>Pet</th>
                <th style={styles.th}>Requested</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const name = r.fullName || r.applicantName || "Unknown applicant";
                const email = r.email || r.applicantEmail;
                const phone = r.phone || r.applicantPhone;
                const reason = r.reason || r.message;
                const status = r.status || "Pending";
                const taken = petAlreadyAdopted(r);

                return (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td style={styles.td}>
                        <div style={styles.applicantName}>{name}</div>
                        {email && <div style={styles.subText}>{email}</div>}
                        {phone && <div style={styles.subText}>{phone}</div>}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.applicantName}>{r.petName || "Unknown"}</div>
                        {r.petType && <div style={styles.subText}>{r.petType}</div>}
                      </td>
                      <td style={styles.td}>{formatDate(r.createdAt || r.date)}</td>
                      <td style={styles.td}>
                        <StatusBadge status={status} />
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            style={styles.actionButton}
                            onClick={() => setViewingId(viewingId === r.id ? null : r.id)}
                          >
                            {viewingId === r.id ? "Close" : "View details"}
                          </button>
                          {status !== "Approved" && !taken && (
                            <button
                              style={styles.approveButton}
                              disabled={updatingId === r.id}
                              onClick={() => decide(r, "Approved")}
                            >
                              Approve
                            </button>
                          )}
                          {status !== "Rejected" && (
                            <button
                              style={styles.rejectButton}
                              disabled={updatingId === r.id}
                              onClick={() => decide(r, "Rejected")}
                            >
                              Reject
                            </button>
                          )}
                        </div>
                        {status !== "Approved" && taken && (
                          <div style={styles.subText}>Pet already adopted by someone else</div>
                        )}
                      </td>
                    </tr>

                    {viewingId === r.id && (
                      <tr>
                        <td style={styles.detailCell} colSpan={5}>
                          <div style={styles.detailGrid}>
                            <Detail label="Full name" value={name} />
                            <Detail label="Email" value={email} />
                            <Detail label="Phone" value={phone} />
                            <Detail label="Age" value={r.age} />
                            <Detail label="Occupation" value={r.occupation} />
                            <Detail label="Housing type" value={r.houseType} />
                            <Detail label="Pet experience" value={r.petExperience} />
                            <Detail label="Home address" value={r.address} wide />
                            <Detail label="Reason for adoption" value={reason} wide />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, wide }) {
  return (
    <div style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value || "Not provided"}</div>
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
  },
  filterButtonActive: { background: "#2e7d32", border: "1px solid #2e7d32", color: "#fff" },
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
    verticalAlign: "top",
  },
  applicantName: { fontWeight: 600, color: "#263238" },
  subText: { fontSize: "12px", color: "#78909c", marginTop: "2px" },
  detailCell: {
    padding: "16px",
    background: "#f8f9fa",
    borderBottom: "1px solid #eceff1",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px 20px",
  },
  detailLabel: { fontSize: "12px", color: "#90a4ae", marginBottom: "2px" },
  detailValue: { fontSize: "14px", color: "#37474f", whiteSpace: "pre-wrap" },
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