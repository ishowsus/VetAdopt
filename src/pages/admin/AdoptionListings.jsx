import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

// Admin review queue for pets adopters submit through /rehome. Nothing an
// adopter lists reaches the Adopt page until it's approved here — enforced
// both by this page and by the "pets" rules in firestore.rules.
function AdoptionListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "pets"), where("listedBy", "==", "adopter"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setListings(data);
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Couldn't load adopter listings.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const decide = async (pet, status) => {
    setUpdatingId(pet.id);
    try {
      await updateDoc(doc(db, "pets", pet.id), { status });
    } catch (err) {
      console.error(err);
      setError("Couldn't update this listing. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const pending = listings.filter((p) => p.status === "Pending Review");
  const visible = showAll ? listings : pending;

  if (loading) {
    return <h2 style={{ textAlign: "center", marginTop: "40px" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏠 Adopter Pet Listings</h2>
      <p style={styles.subtitle}>
        Pets that adopters submitted through "Rehome a Pet." Approve to publish on the Adopt page.
      </p>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.tabRow}>
        <button
          style={{ ...styles.tab, ...(!showAll ? styles.tabActive : {}) }}
          onClick={() => setShowAll(false)}
        >
          Pending ({pending.length})
        </button>
        <button
          style={{ ...styles.tab, ...(showAll ? styles.tabActive : {}) }}
          onClick={() => setShowAll(true)}
        >
          All ({listings.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <div style={styles.emptyState}>
          {showAll ? "No adopter listings yet." : "Nothing waiting for review right now."}
        </div>
      ) : (
        <div style={styles.list}>
          {visible.map((pet) => (
            <div key={pet.id} style={styles.card}>
              {pet.photoUrl && <img src={pet.photoUrl} alt={pet.name} style={styles.img} />}
              <div style={styles.body}>
                <div style={styles.headerRow}>
                  <h4 style={{ margin: 0 }}>{pet.name}</h4>
                  <StatusBadge status={pet.status} />
                </div>
                <p style={styles.meta}>
                  {[pet.species || pet.type, pet.breed, pet.gender, pet.age].filter(Boolean).join(" · ")}
                </p>
                {pet.description && <p style={styles.desc}>{pet.description}</p>}
                <p style={styles.posterId}>Posted by user: {pet.postedBy}</p>

                <div style={styles.actions}>
                  {pet.status !== "Available" && (
                    <button
                      style={styles.approveButton}
                      disabled={updatingId === pet.id}
                      onClick={() => decide(pet, "Available")}
                    >
                      Approve
                    </button>
                  )}
                  {pet.status !== "Rejected" && (
                    <button
                      style={styles.rejectButton}
                      disabled={updatingId === pet.id}
                      onClick={() => decide(pet, "Rejected")}
                    >
                      Reject
                    </button>
                  )}
                </div>
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
    "Pending Review": { bg: "#fff3e0", color: "#e65100" },
    Available: { bg: "#e8f5e9", color: "#2e7d32" },
    Rejected: { bg: "#fdecea", color: "#b3261e" },
    Adopted: { bg: "#e3f2fd", color: "#1565c0" },
  };
  const c = colors[status] || { bg: "#eceff1", color: "#546e7a" };
  return <span style={{ ...styles.badge, background: c.bg, color: c.color }}>{status || "Unknown"}</span>;
}

const styles = {
  container: { padding: "30px" },
  title: { margin: 0, fontSize: "22px" },
  subtitle: { margin: "4px 0 20px", color: "#607d8b" },
  errorBanner: { padding: "12px 16px", background: "#fdecea", color: "#b3261e", borderRadius: "10px", fontSize: "14px", marginBottom: "16px" },
  tabRow: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: { padding: "8px 16px", borderRadius: "999px", border: "1px solid #cfd8dc", background: "#fff", color: "#546e7a", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  tabActive: { background: "#2e7d32", border: "1px solid #2e7d32", color: "#fff" },
  emptyState: { padding: "40px", textAlign: "center", color: "#90a4ae", background: "#f8f9fa", borderRadius: "10px" },
  list: { display: "flex", flexDirection: "column", gap: "14px" },
  card: { display: "flex", gap: "16px", background: "#fff", borderRadius: "14px", padding: "18px", boxShadow: "0 4px 14px rgba(0,0,0,.06)" },
  img: { width: "110px", height: "110px", objectFit: "cover", borderRadius: "10px", flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  meta: { margin: "4px 0 0", fontSize: "13px", color: "#607d8b" },
  desc: { margin: "8px 0 0", fontSize: "13px", color: "#455a64" },
  posterId: { margin: "8px 0 0", fontSize: "11px", color: "#b0bec5", fontFamily: "monospace" },
  actions: { display: "flex", gap: "8px", marginTop: "14px" },
  approveButton: { padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2e7d32", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  rejectButton: { padding: "8px 14px", borderRadius: "8px", border: "1px solid #b3261e", background: "#fff", color: "#b3261e", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  badge: { padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" },
};

export default AdoptionListings;
