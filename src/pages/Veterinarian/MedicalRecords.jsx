import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const snapshot = await getDocs(collection(db, "medicalRecords"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      setRecords(data);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const visibleRecords = records.filter((record) =>
    (record.petName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2>📋 Medical Records</h2>
      <p style={styles.count}>Total Records: {records.length}</p>

      <input
        style={styles.search}
        placeholder="Search by pet name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {visibleRecords.length === 0 ? (
        <div style={styles.emptyState}>
          {records.length === 0
            ? "No medical records yet."
            : "No records match your search."}
        </div>
      ) : (
        <div style={styles.list}>
          {visibleRecords.map((record) => (
            <div key={record.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h4 style={styles.petName}>{record.petName || "Unknown Pet"}</h4>
                <span style={styles.date}>{record.date || "No date"}</span>
              </div>

              {record.diagnosis && (
                <Field label="Diagnosis" value={record.diagnosis} />
              )}
              {record.treatment && (
                <Field label="Treatment" value={record.treatment} />
              )}
              {record.medication && (
                <Field label="Medication" value={record.medication} />
              )}
              {record.notes && <Field label="Notes" value={record.notes} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}:</span>
      <span style={styles.fieldValue}>{value}</span>
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
    alignItems: "center",
    marginBottom: "12px",
  },

  petName: {
    margin: 0,
    fontSize: "16px",
  },

  date: {
    fontSize: "13px",
    color: "#607d8b",
    fontWeight: 600,
  },

  field: {
    display: "flex",
    gap: "6px",
    fontSize: "14px",
    marginBottom: "6px",
    color: "#455a64",
  },

  fieldLabel: {
    fontWeight: 600,
    color: "#2e7d32",
  },

  fieldValue: {
    flex: 1,
  },
};

export default MedicalRecords;
