import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase";

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // 1. Fetch appointments for the active vet to find distinct patient records
    const apptQuery = query(
      collection(db, "appointments"),
      where("vetId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      apptQuery,
      (snapshot) => {
        const patientMap = new Map();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const key = data.petId || data.petName;

          if (key && !patientMap.has(key)) {
            patientMap.set(key, {
              id: doc.id,
              petName: data.petName || "Unknown Pet",
              petBreed: data.petBreed || "N/A",
              petAge: data.petAge || "N/A",
              ownerName: data.ownerName || data.userName || "Unknown Owner",
              ownerPhone: data.ownerPhone || "No contact",
              lastVisit: data.date || "N/A",
            });
          }
        });

        setPatients(Array.from(patientMap.values()));
        setLoading(false);
      },
      (error) => {
        console.error("Error loading patients:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const visiblePatients = patients.filter(
    (patient) =>
      patient.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.petBreed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <h2 style={{ textAlign: "center", margin: "40px 0" }}>Loading Patients...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2>🐶 My Patients</h2>
      <p style={styles.count}>Total Patients: {patients.length}</p>

      <input
        style={styles.search}
        placeholder="Search by pet name or breed..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {visiblePatients.length === 0 ? (
        <div style={styles.emptyState}>
          {patients.length === 0
            ? "No patient history found."
            : "No patients match your search."}
        </div>
      ) : (
        <div style={styles.list}>
          {visiblePatients.map((patient) => (
            <div key={patient.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h4 style={styles.petName}>🐾 {patient.petName}</h4>
                  <p style={styles.breed}>Breed: {patient.petBreed}</p>
                </div>
                <span style={styles.lastVisit}>Last Visit: {patient.lastVisit}</span>
              </div>

              <div style={styles.details}>
                <span>👤 Owner: <strong>{patient.ownerName}</strong></span>
                <span>📞 Contact: {patient.ownerPhone}</span>
                {patient.petAge !== "N/A" && <span>🎂 Age: {patient.petAge}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
  search: {
    width: "100%",
    maxWidth: "360px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #cfd8dc",
    fontSize: "14px",
    marginBottom: "24px",
    boxSizing: "border-box",
    outline: "none",
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
    marginBottom: "12px",
  },
  petName: {
    margin: 0,
    fontSize: "16px",
  },
  breed: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#607d8b",
  },
  lastVisit: {
    fontSize: "12px",
    color: "#2e7d32",
    fontWeight: 600,
    background: "#e8f5e9",
    padding: "4px 10px",
    borderRadius: "999px",
  },
  details: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    fontSize: "14px",
    color: "#455a64",
  },
};

export default Patients;
