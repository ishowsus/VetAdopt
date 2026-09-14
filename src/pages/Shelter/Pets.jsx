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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../Firebase";

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

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const petsQuery = query(
        collection(db, "pets"),
        where("shelterId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(petsQuery);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPets(data);
    } catch (err) {
      console.error(err);
      setError("Couldn't load your pets. Please try again.");
    }
    setLoading(false);
  };

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setPhotoFile(null);
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
    setPhotoFile(null);
    setEditingId(pet.id);
    setFormOpen(true);
    setError("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setPhotoFile(null);
  };

  const handleFieldChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const uploadPhoto = async (petId, file) => {
    const storageRef = ref(storage, `pets/${petId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("You need to be signed in to save a pet.");
      return;
    }
    if (!form.name.trim()) {
      setError("Pet name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        await updateDoc(doc(db, "pets", editingId), { ...form });
        let photoUrl = null;
        if (photoFile) {
          photoUrl = await uploadPhoto(editingId, photoFile);
          await updateDoc(doc(db, "pets", editingId), { photoUrl });
        }
        setPets((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? { ...p, ...form, ...(photoUrl ? { photoUrl } : {}) }
              : p
          )
        );
      } else {
        const newDoc = await addDoc(collection(db, "pets"), {
          ...form,
          shelterId: currentUser.uid,
          createdAt: new Date().toISOString(),
        });
        let photoUrl = null;
        if (photoFile) {
          photoUrl = await uploadPhoto(newDoc.id, photoFile);
          await updateDoc(doc(db, "pets", newDoc.id), { photoUrl });
        }
        setPets((prev) => [
          ...prev,
          {
            id: newDoc.id,
            ...form,
            shelterId: currentUser.uid,
            ...(photoUrl ? { photoUrl } : {}),
          },
        ]);
      }
      closeForm();
    } catch (err) {
      console.error(err);
      setError("Couldn't save this pet. Please try again.");
    }

    setSaving(false);
  };

  const handleDelete = async (petId) => {
    if (!window.confirm("Delete this pet? This can't be undone.")) return;

    setSavingId(petId);
    try {
      await deleteDoc(doc(db, "pets", petId));
      setPets((prev) => prev.filter((p) => p.id !== petId));
      if (viewingId === petId) setViewingId(null);
    } catch (err) {
      console.error(err);
      setError("Couldn't delete this pet. Please try again.");
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
      console.error(err);
      setError("Couldn't update status. Please try again.");
    }
    setSavingId(null);
  };

  if (loading) {
    return <h2 style={{ textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>🐾 My Pets</h2>
          <p style={styles.subtitle}>Total Pets: {pets.length}</p>
        </div>
        <button style={styles.addButton} onClick={openAddForm}>
          ➕ Add Pet
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {formOpen && (
        <form style={styles.formCard} onSubmit={handleSave}>
          <h3 style={styles.formTitle}>
            {editingId ? "✏️ Edit Pet" : "➕ Add New Pet"}
          </h3>

          <div style={styles.formGrid}>
            <FormField label="Name">
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
                placeholder="e.g. Dog"
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
                placeholder="e.g. 2 years"
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
            <FormField label="Photo">
              <input
                type="file"
                accept="image/*"
                style={styles.input}
                onChange={(e) => setPhotoFile(e.target.files[0] || null)}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              style={{ ...styles.input, minHeight: "70px" }}
              value={form.description}
              onChange={handleFieldChange("description")}
              placeholder="Temperament, medical notes, etc."
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
              {saving ? "Saving..." : "Save Pet"}
            </button>
          </div>
        </form>
      )}

      {pets.length === 0 ? (
        <div style={styles.emptyState}>
          No pets yet. Click "Add Pet" to list your first one.
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
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pets.map((pet) => (
                <>
                  <tr key={pet.id}>
                    <td style={styles.td}>
                      {pet.photoUrl ? (
                        <img src={pet.photoUrl} alt={pet.name} style={styles.thumb} />
                      ) : (
                        <div style={styles.thumbPlaceholder}>🐾</div>
                      )}
                    </td>
                    <td style={styles.td}>{pet.name || "Unnamed"}</td>
                    <td style={styles.td}>{pet.species || "-"}</td>
                    <td style={styles.td}>{pet.breed || "-"}</td>
                    <td style={styles.td}>{pet.age || "-"}</td>
                    <td style={styles.td}>
                      <select
                        style={styles.statusSelect}
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
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() =>
                            setViewingId(viewingId === pet.id ? null : pet.id)
                          }
                        >
                          👁 View
                        </button>
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
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {viewingId === pet.id && (
                    <tr key={`${pet.id}-detail`}>
                      <td style={styles.detailCell} colSpan={7}>
                        <strong>Description:</strong>{" "}
                        {pet.description || "No description provided."}
                      </td>
                    </tr>
                  )}
                </>
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
    padding: "30px",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },

  title: {
    margin: 0,
    fontSize: "22px",
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#607d8b",
  },

  addButton: {
    padding: "12px 20px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  errorBanner: {
    padding: "12px 16px",
    background: "#fdecea",
    color: "#b3261e",
    borderRadius: "10px",
    fontSize: "14px",
    marginBottom: "16px",
  },

  formCard: {
    background: "#fff",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 14px rgba(0,0,0,.06)",
    marginBottom: "24px",
  },

  formTitle: {
    margin: "0 0 16px",
    fontSize: "17px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: "14px",
    marginBottom: "14px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "14px",
  },

  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#2e7d32",
  },

  input: {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cfd8dc",
    borderRadius: "8px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
  },

  primaryButton: {
    padding: "10px 20px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "10px 20px",
    background: "#fff",
    color: "#2e7d32",
    border: "2px solid #2e7d32",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
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

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

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

  thumb: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    objectFit: "cover",
  },

  thumbPlaceholder: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    background: "#eef5ef",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },

  statusSelect: {
    padding: "6px 8px",
    fontSize: "13px",
    borderRadius: "8px",
    border: "1px solid #cfd8dc",
  },

  actions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

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

  deleteButton: {
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

export default Pets;