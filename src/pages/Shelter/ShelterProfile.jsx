import { useEffect, useRef, useState } from "react";
import { auth, db, storage } from "../../Firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

const EMPTY_PROFILE = {
  shelterName: "",
  ownerName: "",
  email: "",
  phone: "",
  address: "",
  businessPermit: "",
  description: "",
  logoUrl: "",
  dateRegistered: "",
};

const FIELDS = [
  { key: "shelterName", label: "Shelter Name" },
  { key: "ownerName", label: "Owner Name" },
  { key: "phone", label: "Phone Number" },
  { key: "address", label: "Address" },
  { key: "businessPermit", label: "Business Permit" },
];

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

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

  const handleChange = (key) => (e) => {
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleEditClick = () => {
    setDraft(profile);
    setError("");
    setNotice("");
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
    setNotice("");

    try {
      const docRef = doc(db, "users", currentUser.uid);
      await setDoc(docRef, draft, { merge: true });
      setProfile(draft);
      setEditing(false);
      setNotice("Profile updated.");
    } catch (err) {
      console.error(err);
      setError("Couldn't save your changes. Please try again.");
    }

    setSaving(false);
  };

  const handleLogoSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You need to be signed in to upload a logo.");
      return;
    }

    setUploadingLogo(true);
    setError("");
    setNotice("");

    try {
      const storageRef = ref(storage, `shelterLogos/${currentUser.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const logoUrl = await getDownloadURL(storageRef);

      await setDoc(doc(db, "users", currentUser.uid), { logoUrl }, { merge: true });

      setProfile((prev) => ({ ...prev, logoUrl }));
      setDraft((prev) => ({ ...prev, logoUrl }));
      setNotice("Logo updated.");
    } catch (err) {
      console.error(err);
      setError("Couldn't upload the logo. Please try again.");
    }

    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handlePasswordFieldChange = (key) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setPasswordError("You need to be signed in to change your password.");
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword) {
      setPasswordError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordFormOpen(false);
      setNotice("Password updated.");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("Current password is incorrect.");
      } else {
        setPasswordError("Couldn't change your password. Please try again.");
      }
    }

    setPasswordSaving(false);
  };

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt="Shelter logo" style={styles.logo} />
            ) : (
              <div style={styles.logoPlaceholder}>🏡</div>
            )}
            <button
              type="button"
              style={styles.uploadLogoButton}
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? "Uploading..." : "📷 Upload Logo"}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoSelected}
            />
          </div>

          <h2>{profile.shelterName || "Shelter"}</h2>
          <p>{profile.email}</p>
          {profile.dateRegistered && (
            <p style={styles.registeredText}>
              Registered {profile.dateRegistered}
            </p>
          )}
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {notice && <div style={styles.noticeBanner}>{notice}</div>}

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

        <div style={{ padding: "0 30px 24px" }}>
          <label style={styles.descLabel}>Description</label>
          {editing ? (
            <textarea
              style={styles.textarea}
              value={draft.description}
              onChange={handleChange("description")}
              placeholder="Tell adopters about your shelter..."
            />
          ) : (
            <p style={styles.descText}>
              {profile.description || "No description provided."}
            </p>
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
          <div style={styles.buttonRow}>
            <button style={styles.button} onClick={handleEditClick}>
              Edit Profile
            </button>
            <button
              style={styles.secondaryButton}
              onClick={() => setPasswordFormOpen((open) => !open)}
            >
              Change Password
            </button>
          </div>
        )}

        {passwordFormOpen && (
          <form style={styles.passwordForm} onSubmit={handleChangePassword}>
            <h4 style={{ margin: "0 0 12px" }}>Change Password</h4>

            {passwordError && <div style={styles.errorBanner}>{passwordError}</div>}

            <input
              type="password"
              style={styles.input}
              placeholder="Current password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange("currentPassword")}
            />
            <input
              type="password"
              style={styles.input}
              placeholder="New password"
              value={passwordForm.newPassword}
              onChange={handlePasswordFieldChange("newPassword")}
            />
            <input
              type="password"
              style={styles.input}
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange("confirmPassword")}
            />

            <div style={styles.buttonRow}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setPasswordFormOpen(false)}
                disabled={passwordSaving}
              >
                Cancel
              </button>
              <button type="submit" style={styles.button} disabled={passwordSaving}>
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
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
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      <input style={styles.input} value={value} onChange={onChange} placeholder={title} />
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

  logoWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    marginBottom: "15px",
  },

  logo: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    border: "5px solid white",
    objectFit: "cover",
  },

  logoPlaceholder: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    border: "5px solid white",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
  },

  uploadLogoButton: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: "999px",
    cursor: "pointer",
  },

  registeredText: {
    fontSize: "13px",
    opacity: 0.85,
    marginTop: "4px",
  },

  errorBanner: {
    margin: "20px 30px 0",
    padding: "12px 16px",
    background: "#fdecea",
    color: "#b3261e",
    borderRadius: "10px",
    fontSize: "14px",
  },

  noticeBanner: {
    margin: "20px 30px 0",
    padding: "12px 16px",
    background: "#e8f5e9",
    color: "#2e7d32",
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

  descLabel: {
    display: "block",
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: "8px",
  },

  descText: {
    margin: 0,
    color: "#455a64",
    lineHeight: 1.5,
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "12px",
    fontSize: "14px",
    border: "1px solid #cfd8dc",
    borderRadius: "8px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "15px",
    border: "1px solid #cfd8dc",
    borderRadius: "8px",
    boxSizing: "border-box",
    outline: "none",
    marginBottom: "10px",
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

  passwordForm: {
    margin: "0 30px 30px",
    padding: "20px",
    background: "#f8f9fa",
    borderRadius: "12px",
  },
};

export default Profile;