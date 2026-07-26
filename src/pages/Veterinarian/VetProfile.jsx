import { useEffect, useState } from "react";
import { auth, db } from "../../Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const EMPTY_PROFILE = {
  name: "",
  email: "",
  phone: "",
  clinicName: "",
  specialization: "",
  licenseNumber: "",
  experience: "",
  address: "",
  workingHours: "",
};

const FIELDS = [
  { key: "clinicName", label: "Clinic Name" },
  { key: "phone", label: "Phone Number" },
  { key: "specialization", label: "Specialization" },
  { key: "licenseNumber", label: "License Number" },
  { key: "experience", label: "Experience" },
  { key: "workingHours", label: "Working Hours" },
  { key: "address", label: "Address" },
];

function VetProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoading(false);
          return;
        }

        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { ...EMPTY_PROFILE, ...docSnap.data() };
          setProfile(data);
          setDraft(data);
        } else {
          const fallback = {
            ...EMPTY_PROFILE,
            email: currentUser.email || "",
          };
          setProfile(fallback);
          setDraft(fallback);
        }
      } catch (err) {
        console.error(err);
        setError("Couldn't load your profile. Please try again.");
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleChange = (key) => (e) => {
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleEditClick = () => {
    setDraft(profile);
    setError("");
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(profile);
    setError("");
    setEditing(false);
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You need to be signed in to save changes.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const docRef = doc(db, "users", currentUser.uid);
      await setDoc(docRef, draft, { merge: true });
      setProfile(draft);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError("Couldn't save your changes. Please try again.");
    }

    setSaving(false);
  };

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img
            src="https://ui-avatars.com/api/?name=Veterinarian&background=2e7d32&color=fff&size=200"
            alt="Profile"
            style={styles.avatar}
          />
          <h2>{profile.name || "Veterinarian"}</h2>
          <p>{profile.email}</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.grid}>
          {FIELDS.map((field) =>
            editing ? (
              <EditableInfo
                key={field.key}
                title={field.label}
                value={draft[field.key]}
                onChange={handleChange(field.key)}
              />
            ) : (
              <Info key={field.key} title={field.label} value={profile[field.key]} />
            )
          )}
        </div>

        {editing ? (
          <div style={styles.buttonRow}>
            <button style={styles.secondaryButton} onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button style={styles.button} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          <button style={styles.button} onClick={handleEditClick}>
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div style={styles.infoBox}>
      <h4>{title}</h4>
      <p>{value || "Not Provided"}</p>
    </div>
  );
}

function EditableInfo({ title, value, onChange }) {
  return (
    <div style={styles.infoBox}>
      <h4 style={styles.infoBoxLabel}>{title}</h4>
      <input
        style={styles.input}
        value={value}
        onChange={onChange}
        placeholder={title}
      />
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    background: "#f5f7fa",
    minHeight: "100vh",
  },

  card: {
    maxWidth: "900px",
    margin: "auto",
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,.1)",
    overflow: "hidden",
  },

  header: {
    background: "#2e7d32",
    color: "#fff",
    textAlign: "center",
    padding: "40px",
  },

  avatar: {
    width: "130px",
    height: "130px",
    borderRadius: "50%",
    border: "5px solid white",
    marginBottom: "15px",
  },

  errorBanner: {
    margin: "20px 30px 0",
    padding: "12px 16px",
    background: "#fdecea",
    color: "#b3261e",
    borderRadius: "10px",
    fontSize: "14px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: "20px",
    padding: "30px",
  },

  infoBox: {
    background: "#f8f9fa",
    padding: "20px",
    borderRadius: "12px",
    borderLeft: "5px solid #2e7d32",
  },

  infoBoxLabel: {
    margin: "0 0 8px",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "15px",
    border: "1px solid #cfd8dc",
    borderRadius: "8px",
    boxSizing: "border-box",
    outline: "none",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    margin: "0 30px 30px",
  },

  button: {
    flex: 1,
    padding: "14px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },

  secondaryButton: {
    flex: 1,
    padding: "14px",
    background: "#fff",
    color: "#2e7d32",
    border: "2px solid #2e7d32",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default VetProfile;