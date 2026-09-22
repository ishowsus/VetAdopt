import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { supabase } from "../../supabase";

const STATUS_OPTIONS = ["Available", "Pending", "Adopted"];

const EMPTY_FORM = {
  name: "",
  species: "",
  breed: "",
  age: "",
  status: "Available",
  description: "",
};

function Pets() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("adopter");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setPets([]);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let role = "adopter";

        if (userDocSnap.exists()) {
          role = (userDocSnap.data().role || "adopter").toLowerCase();
        }
        setUserRole(role);

        const petsQuery = query(
          collection(db, "pets"),
          where("postedBy", "==", currentUser.uid)
        );
        const snapshot = await getDocs(petsQuery);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPets(data);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError("Couldn't load pet listings. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose a photo smaller than 5MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    setPhotoUrl("");
    setPreviewUrl("");
    setEditingId(null);
    setFormOpen(true);
    setError("");
  };

  const openEditForm = (pet) => {
    setForm({
      name: pet.name || "",
      species: pet.species || "",
      breed: pet.breed || "",
      age: pet.age || "",
      status: pet.status || "Available",
      description: pet.description || "",
    });
    setPhotoUrl(pet.photoUrl || "");
    setPreviewUrl(pet.photoUrl || "");
    setSelectedFile(null);
    setEditingId(pet.id);
    setFormOpen(true);
    setError("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setSelectedFile(null);
    setPhotoUrl("");
    setPreviewUrl("");
  };

  const handleFieldChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You need to be signed in to save a pet listing.");
      return;
    }
    if (!form.name.trim()) {
      setError("Pet name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let finalPhotoUrl = photoUrl;

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `pets/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrlData.publicUrl;
      }

      const petPayload = {
        ...form,
        postedBy: currentUser.uid,
        postedByRole: userRole,
        shelterId: userRole === "shelter" ? currentUser.uid : null,
        photoUrl: finalPhotoUrl,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, "pets", editingId), petPayload);
        setPets((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...petPayload } : p))
        );
      } else {
        petPayload.createdAt = new Date().toISOString();
        const newDoc = await addDoc(collection(db, "pets"), petPayload);
        setPets((prev) => [...prev, { id: newDoc.id, ...petPayload }]);
      }
      closeForm();
    } catch (err) {
      console.error("Save Error:", err);
      setError(`Couldn't save this pet listing: ${err.message}`);
    }

    setSaving(false);
  };

  const handleDelete = async (petId) => {
    if (!window.confirm("Delete this pet listing? This action cannot be undone.")) return;

    setSavingId(petId);
    try {
      await deleteDoc(doc(db, "pets", petId));
      setPets((prev) => prev.filter((p) => p.id !== petId));
    } catch (err) {
      console.error("Delete Error:", err);
      setError("Couldn't delete this pet listing.");
    }
    setSavingId(null);
  };

  const handleStatusChange = async (petId, status) => {
    setSavingId(petId);
    try {
      await updateDoc(doc(db, "pets", petId), { status });
      setPets((prev) =>
        prev.map((p) => (p.id === petId ? { ...p, status } : p))
      );
    } catch (err) {
      console.error("Status Error:", err);
      setError("Couldn't update status.");
    }
    setSavingId(null);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading listings...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>
            🐾 {userRole === "shelter" ? "Shelter Pet Listings" : "My Posted Pets"}
          </h2>
          <span style={styles.badgeCount}>{pets.length} active listings</span>
        </div>
        {!formOpen && (
          <button style={styles.addButton} onClick={openAddForm}>
            ➕ Post Pet Listing
          </button>
        )}
      </div>

      {error && <div style={styles.errorBanner}>⚠️ {error}</div>}

      {/* Form Card */}
      {formOpen && (
        <form style={styles.formCard} onSubmit={handleSave}>
          <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>
              {editingId ? "✏️ Edit Pet Listing" : "➕ Post New Pet"}
            </h3>
            <p style={styles.formSubtitle}>
              Fill in the details below to publish your pet listing.
            </p>
          </div>

          <div style={styles.formGrid}>
            <FormField label="Pet Name *">
              <input
                style={styles.input}
                value={form.name}
                onChange={handleFieldChange("name")}
                placeholder="e.g. Bella"
                required
              />
            </FormField>

            <FormField label="Species">
              <input
                style={styles.input}
                value={form.species}
                onChange={handleFieldChange("species")}
                placeholder="e.g. Dog, Cat"
              />
            </FormField>

            <FormField label="Breed">
              <input
                style={styles.input}
                value={form.breed}
                onChange={handleFieldChange("breed")}
                placeholder="e.g. Golden Retriever"
              />
            </FormField>

            <FormField label="Age">
              <input
                style={styles.input}
                value={form.age}
                onChange={handleFieldChange("age")}
                placeholder="e.g. 2 years, 6 months"
              />
            </FormField>

            <FormField label="Adoption Status">
              <select
                style={styles.input}
                value={form.status}
                onChange={handleFieldChange("status")}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Upload Photo">
              <input
                type="file"
                accept="image/*"
                style={styles.fileInput}
                onChange={handleFileChange}
              />
            </FormField>
          </div>

          {previewUrl && (
            <div style={styles.previewContainer}>
              <span style={styles.previewLabel}>Photo Preview:</span>
              <img src={previewUrl} alt="Preview" style={styles.imagePreview} />
            </div>
          )}

          <FormField label="Description">
            <textarea
              style={styles.textarea}
              value={form.description}
              onChange={handleFieldChange("description")}
              placeholder="Temperament, medical notes, rehoming reason, etc."
            />
          </FormField>

          <div style={styles.formActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving ? "Uploading & Saving..." : "Save Listing"}
            </button>
          </div>
        </form>
      )}

      {/* Table / Empty View */}
      {pets.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🐶</div>
          <strong>No listings found</strong>
          <p style={{ margin: "4px 0 0", color: "#64748b" }}>
            Click "Post Pet Listing" to start creating your first profile.
          </p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Photo</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Species</th>
                <th style={styles.th}>Breed</th>
                <th style={styles.th}>Age</th>
                <th style={styles.th}>Status</th>
                <th style={styles.thRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pets.map((pet) => (
                <tr key={pet.id} style={styles.tr}>
                  <td style={styles.td}>
                    {pet.photoUrl ? (
                      <img
                        src={pet.photoUrl}
                        alt={pet.name || "Pet"}
                        style={styles.thumb}
                      />
                    ) : (
                      <div style={styles.thumbPlaceholder}>🐾</div>
                    )}
                  </td>
                  <td style={styles.tdBold}>{pet.name || "Unnamed"}</td>
                  <td style={styles.td}>{pet.species || "-"}</td>
                  <td style={styles.td}>{pet.breed || "-"}</td>
                  <td style={styles.td}>{pet.age || "-"}</td>
                  <td style={styles.td}>
                    <select
                      style={{
                        ...styles.statusSelect,
                        ...(pet.status === "Available"
                          ? styles.statusAvailable
                          : pet.status === "Pending"
                          ? styles.statusPending
                          : styles.statusAdopted),
                      }}
                      value={pet.status || "Available"}
                      disabled={savingId === pet.id}
                      onChange={(e) => handleStatusChange(pet.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.tdRight}>
                    <div style={styles.actions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => openEditForm(pet)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        style={styles.deleteButton}
                        disabled={savingId === pet.id}
                        onClick={() => handleDelete(pet.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "32px 20px",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1e293b",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "300px",
    color: "#64748b",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: { margin: 0, fontSize: "24px", fontWeight: 700, color: "#0f172a" },
  badgeCount: {
    display: "inline-block",
    marginTop: "4px",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 500,
  },
  addButton: {
    padding: "10px 18px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  },
  errorBanner: {
    padding: "12px 16px",
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "20px",
  },
  formCard: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    marginBottom: "32px",
  },
  formHeader: { marginBottom: "20px" },
  formTitle: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" },
  formSubtitle: { margin: "4px 0 0", fontSize: "13px", color: "#64748b" },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#334155" },
  input: {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },
  fileInput: {
    padding: "7px 8px",
    fontSize: "13px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    background: "#f8fafc",
    boxSizing: "border-box",
    width: "100%",
  },
  previewContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    padding: "10px",
    background: "#f8fafc",
    borderRadius: "8px",
  },
  previewLabel: { fontSize: "12px", fontWeight: 600, color: "#64748b" },
  imagePreview: {
    width: "60px",
    height: "60px",
    borderRadius: "6px",
    objectFit: "cover",
    border: "1px solid #cbd5e1",
  },
  textarea: {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    outline: "none",
    minHeight: "80px",
    resize: "vertical",
    boxSizing: "border-box",
    width: "100%",
    fontFamily: "inherit",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  primaryButton: {
    padding: "10px 20px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 20px",
    background: "#fff",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyState: {
    padding: "48px 24px",
    textAlign: "center",
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px dashed #cbd5e1",
  },
  tableWrap: {
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
    overflowX: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "650px" },
  th: {
    textAlign: "left",
    padding: "14px 18px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  thRight: {
    textAlign: "right",
    padding: "14px 18px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: {
    padding: "14px 18px",
    fontSize: "14px",
    color: "#334155",
    verticalAlign: "middle",
  },
  tdBold: {
    padding: "14px 18px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#0f172a",
    verticalAlign: "middle",
  },
  tdRight: {
    padding: "14px 18px",
    fontSize: "14px",
    textAlign: "right",
    verticalAlign: "middle",
  },
  thumb: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    objectFit: "cover",
    display: "block",
  },
  thumbPlaceholder: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },
  statusSelect: {
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "20px",
    border: "1px solid transparent",
    outline: "none",
    cursor: "pointer",
  },
  statusAvailable: { background: "#dcfce7", color: "#166534" },
  statusPending: { background: "#fef9c3", color: "#854d0e" },
  statusAdopted: { background: "#f1f5f9", color: "#475569" },
  actions: { display: "inline-flex", gap: "8px", alignItems: "center" },
  actionButton: {
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: 600,
    background: "#f1f5f9",
    color: "#334155",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: 600,
    background: "#fef2f2",
    color: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default Pets;
