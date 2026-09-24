import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useVetAppointments, buildPatients, formatDate, STATUS_COLORS } from "./vetHelpers";

// Field names an adopter's pet document might use for its owner's uid.
const OWNER_FIELDS = ["ownerId", "userId", "uid", "adopterId"];

function Patients() {
  const { appointments, loading, error, user } = useVetAppointments();
  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState("");

  // Optional extra details (breed, species, age...) from the "pets" collection.
  // If this read fails, patients still show using their appointment data.
  useEffect(() => {
    const loadPets = async () => {
      try {
        const snap = await getDocs(collection(db, "pets"));
        setPets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    };
    loadPets();
  }, []);

  const patients = useMemo(() => {
    const base = buildPatients(appointments);

    return base.map((p) => {
      const match =
        pets.find((pet) => p.petId && pet.id === p.petId) ||
        pets.find(
          (pet) =>
            (pet.name || "").trim().toLowerCase() === p.name.toLowerCase() &&
            OWNER_FIELDS.some((f) => pet[f] && pet[f] === p.userId)
        );
      return { ...p, pet: match || null };
    });
  }, [appointments, pets]);

  const shown = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.ownerName || "").toLowerCase().includes(q) ||
      (p.pet?.breed || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  if (!user) {
    return <h2 style={{ textAlign: "center" }}>Please log in to view your patients.</h2>;
  }

  return (
    <div style={styles.container}>
      <h2>🐶 My Patients</h2>
      <p style={styles.count}>Total Patients: {patients.length}</p>

      {error && <div style={styles.error}>Couldn't load patients: {error}</div>}

      {patients.length > 0 && (
        <input
          style={styles.search}
          placeholder="Search by pet, owner or breed"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {patients.length === 0 ? (
        <div style={styles.emptyState}>
          No patients yet. A pet shows up here once an adopter books an appointment with you.
        </div>
      ) : shown.length === 0 ? (
        <div style={styles.emptyState}>No patients match "{search}".</div>
      ) : (
        <div style={styles.list}>
          {shown.map((p) => {
            const details = [p.pet?.species || p.pet?.type, p.pet?.breed, p.pet?.age]
              .filter(Boolean)
              .join(" · ");
            const next = p.nextVisit;
            const nextColor = next ? STATUS_COLORS[next.status] : null;

            return (
              <div key={p.key} style={styles.card}>
                <div style={styles.avatar}>{p.name.charAt(0).toUpperCase()}</div>

                <div style={styles.body}>
                  <h4 style={styles.petName}>{p.name}</h4>
                  {details && <p style={styles.meta}>{details}</p>}
                  {p.ownerName && <p style={styles.meta}>Owner: {p.ownerName}</p>}

                  <div style={styles.visitRow}>
                    <span>
                      🗂️ {p.visitCount} visit{p.visitCount !== 1 ? "s" : ""}
                    </span>
                    {p.lastVisit && <span>✔️ Last visit: {formatDate(p.lastVisit.date)}</span>}
                  </div>
                </div>

                {next && (
                  <div style={styles.next}>
                    <span style={styles.nextLabel}>Next visit</span>
                    <strong>{formatDate(next.date)}</strong>
                    <span>{next.time}</span>
                    <span
                      style={{ ...styles.badge, background: nextColor.bg, color: nextColor.color }}
                    >
                      {next.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
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
  search: {
    width: "100%",
    maxWidth: "360px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #cfd8dc",
    fontSize: "14px",
    marginBottom: "20px",
    boxSizing: "border-box",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#90a4ae",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  list: { display: "flex", flexDirection: "column", gap: "14px" },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    background: "#fff",
    borderRadius: "14px",
    padding: "18px 20px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    borderLeft: "5px solid #7b1fa2",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#f3e5f5",
    color: "#7b1fa2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "20px",
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: "180px" },
  petName: { margin: 0, fontSize: "16px" },
  meta: { margin: "4px 0 0", fontSize: "13px", color: "#607d8b" },
  visitRow: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    marginTop: "10px",
    fontSize: "13px",
    color: "#455a64",
  },
  next: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
    fontSize: "13px",
    color: "#455a64",
    background: "#f8f9fa",
    padding: "10px 14px",
    borderRadius: "10px",
  },
  nextLabel: { fontSize: "12px", color: "#90a4ae" },
  badge: {
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
  },
};

export default Patients;