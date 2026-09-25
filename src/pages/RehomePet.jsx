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
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { supabase } from "../supabase";

// Every listing an adopter creates starts here and needs an admin to approve
// it before it appears on the Adopt page. See the "pets" rules in
// firestore.rules — the server enforces this too, not just this form.
const REVIEW_STATUS = "Pending Review";

const SPECIES_OPTIONS = ["Dog", "Cat", "Rabbit", "Bird", "Other"];
const GENDER_OPTIONS = ["Male", "Female"];

const normalizeSpecies = (value = "") => {
  const s = String(value).trim().toLowerCase().replace(/s$/, "");
  if (!s) return "";
  if (s === "parrot") return "Bird";
  return SPECIES_OPTIONS.find((o) => o.toLowerCase() === s) || "Other";
};

const EMPTY_FORM = {
  name: "",
  species: "",
  gender: "",
  breed: "",
  age: "",
  description: "",
  tags: "",
};

const STATUS_STYLES = {
  "Pending Review": { bg: "#fff3e0", color: "#e65100", label: "Pending review" },
  Available: { bg: "#e8f5e9", color: "#2e7d32", label: "Live on Adopt page" },
  Pending: { bg: "#fff3e0", color: "#e65100", label: "Application pending" },
  Adopted: { bg: "#e3f2fd", color: "#1565c0", label: "Adopted" },
  Rejected: { bg: "#fdecea", color: "#b3261e", label: "Not approved" },
};

function RehomePet() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setListings([]);
        setLoading(false);
        return;
      }
      await loadListings(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  const loadListings = async (uid) => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "pets"), where("postedBy", "==", uid), where("listedBy", "==", "adopter"))
      );
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setError("");
    } catch (err) {
      console.error(err);
      setError("Couldn't load your listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
    setNotice("");
  };

  const openEditForm = (pet) => {
    setForm({
      name: pet.name || "",
      species: normalizeSpecies(pet.species || pet.type),
      gender: pet.gender || "",
      breed: pet.breed || "",
      age: pet.age || "",
      description: pet.description || "",
      tags: Array.isArray(pet.tags) ? pet.tags.join(", ") : "",
    });
    setPhotoUrl(pet.photoUrl || "");
    setPreviewUrl(pet.photoUrl || "");
    setSelectedFile(null);
    setEditingId(pet.id);
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setSelectedFile(null);
    setPhotoUrl("");
    setPreviewUrl("");
  };

  const handleFieldChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("You need to be signed in to list a pet.");
      return;
    }
    if (!form.name.trim()) {
      setError("Pet name is required.");
      return;
    }
    if (!form.species) {
      setError("Please choose a species.");
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

      // Editing an existing listing sends it back for review. Otherwise an
      // adopter could get a listing approved and then quietly swap in
      // different photos or a different description afterward.
      const petPayload = {
        name: form.name.trim(),
        species: form.species,
        type: form.species,
        gender: form.gender,
        breed: form.breed,
        age: form.age,
        description: form.description,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        photoUrl: finalPhotoUrl,
        postedBy: user.uid,
        postedByRole: "adopter",
        listedBy: "adopter",
        status: REVIEW_STATUS,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, "pets", editingId), petPayload);
      } else {
        petPayload.createdAt = new Date().toISOString();
        await addDoc(collection(db, "pets"), petPayload);
      }

      closeForm();
      setNotice(
        `${petPayload.name} was submitted for review. An admin will check it before it appears on the Adopt page.`
      );
      await loadListings(user.uid);
    } catch (err) {
      console.error("Save error:", err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pet) => {
    if (!window.confirm(`Remove ${pet.name}'s listing? This can't be undone.`)) return;
    try {
      await deleteDoc(doc(db, "pets", pet.id));
      setListings((prev) => prev.filter((p) => p.id !== pet.id));
      setNotice(`${pet.name}'s listing was removed.`);
    } catch (err) {
      console.error(err);
      setError("Couldn't remove this listing. Please try again.");
    }
  };

  if (loading) {
    return <h2 style={{ textAlign: "center", marginTop: "40px" }}>Loading...</h2>;
  }

  if (!user) {
    return <h2 style={{ textAlign: "center", marginTop: "40px" }}>Please log in to list a pet.</h2>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>🏠 Rehome a Pet</h2>
          <p style={styles.subtitle}>
            List a pet that needs a new home. An admin reviews every listing before it appears
            on the Adopt page, to keep things safe for everyone.
          </p>
        </div>
        {!formOpen && (
          <button style={styles.addButton} onClick={openAddForm}>
            + List a Pet
          </button>
        )}
      </div>

      {error && <div style={styles.errorBanner}>⚠️ {error}</div>}
      {notice && <div style={styles.noticeBanner}>✅ {notice}</div>}

      {formOpen && (
        <form onSubmit={handleSave} style={styles.formCard}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Listing" : "New Listing"}</h3>

          <div style={styles.formGrid}>
            <FormField label="Pet Name *">
              <input
                style={styles.input}
                value={form.name}
                onChange={handleFieldChange("name")}
                placeholder="e.g. Bantay"
              />
            </FormField>

            <FormField label="Species *">
              <select style={styles.input} value={form.species} onChange={handleFieldChange("species")} required>
                <option value="">— Select species —</option>
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Gender">
              <select style={styles.input} value={form.gender} onChange={handleFieldChange("gender")}>
                <option value="">— Select gender —</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Breed">
              <input
                style={styles.input}
                value={form.breed}
                onChange={handleFieldChange("breed")}
                placeholder="e.g. Aspin, Persian"
              />
            </FormField>

            <FormField label="Age">
              <input
                style={styles.input}
                value={form.age}
                onChange={handleFieldChange("age")}
                placeholder="e.g. 2 years or 6 months"
              />
            </FormField>
          </div>

          <FormField label="Tags (optional, separate with commas)">
            <input
              style={styles.input}
              value={form.tags}
              onChange={handleFieldChange("tags")}
              placeholder="e.g. Vaccinated, Friendly, Good with kids"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              style={{ ...styles.input, minHeight: "90px", resize: "vertical" }}
              value={form.description}
              onChange={handleFieldChange("description")}
              placeholder="Tell adopters about this pet's personality, habits, and why they need a new home."
            />
          </FormField>

          <FormField label="Photo">
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {previewUrl && (
              <img src={previewUrl} alt="Preview" style={styles.previewImg} />
            )}
          </FormField>

          <div style={styles.formActions}>
            <button type="button" style={styles.cancelButton} onClick={closeForm} disabled={saving}>
              Cancel
            </button>
            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Submit for Review"}
            </button>
          </div>
        </form>
      )}

      <h3 style={styles.sectionTitle}>Your Listings</h3>

      {listings.length === 0 ? (
        <div style={styles.emptyState}>You haven't listed any pets yet.</div>
      ) : (
        <div style={styles.list}>
          {listings.map((pet) => {
            const s = STATUS_STYLES[pet.status] || STATUS_STYLES["Pending Review"];
            return (
              <div key={pet.id} style={styles.card}>
                {pet.photoUrl && (
                  <img src={pet.photoUrl} alt={pet.name} style={styles.cardImg} />
                )}
                <div style={styles.cardBody}>
                  <div style={styles.cardHeader}>
                    <h4 style={{ margin: 0 }}>{pet.name}</h4>
                    <span style={{ ...styles.badge, background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                  <p style={styles.cardMeta}>
                    {[pet.species || pet.type, pet.breed, pet.gender, pet.age].filter(Boolean).join(" · ")}
                  </p>
                  {pet.status === "Rejected" && (
                    <p style={styles.rejectedNote}>
                      This listing wasn't approved. You can edit it and resubmit.
                    </p>
                  )}
                  <div style={styles.cardActions}>
                    {pet.status !== "Adopted" && (
                      <button style={styles.editButton} onClick={() => openEditForm(pet)}>
                        Edit
                      </button>
                    )}
                    <button style={styles.deleteButton} onClick={() => handleDelete(pet)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#37474f", marginBottom: "6px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const styles = {
  container: { padding: "30px", maxWidth: "900px", margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "20px" },
  title: { margin: 0, fontSize: "22px" },
  subtitle: { margin: "6px 0 0", color: "#607d8b", fontSize: "14px", maxWidth: "520px" },
  addButton: {
    padding: "12px 20px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  errorBanner: { padding: "12px 16px", background: "#fdecea", color: "#b3261e", borderRadius: "10px", fontSize: "14px", marginBottom: "16px" },
  noticeBanner: { padding: "12px 16px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" },
  formCard: { background: "#fff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 14px rgba(0,0,0,.06)", marginBottom: "30px" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0 16px" },
  input: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cfd8dc", fontSize: "14px", boxSizing: "border-box" },
  previewImg: { display: "block", marginTop: "10px", maxWidth: "160px", borderRadius: "10px" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" },
  cancelButton: { padding: "10px 18px", borderRadius: "8px", border: "1px solid #cfd8dc", background: "#fff", color: "#546e7a", fontWeight: 600, cursor: "pointer" },
  saveButton: { padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2e7d32", color: "#fff", fontWeight: 600, cursor: "pointer" },
  sectionTitle: { fontSize: "16px", color: "#263238", marginBottom: "14px" },
  emptyState: { padding: "40px", textAlign: "center", color: "#90a4ae", background: "#f8f9fa", borderRadius: "10px" },
  list: { display: "flex", flexDirection: "column", gap: "14px" },
  card: { display: "flex", gap: "16px", background: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 4px 14px rgba(0,0,0,.06)" },
  cardImg: { width: "96px", height: "96px", objectFit: "cover", borderRadius: "10px", flexShrink: 0 },
  cardBody: { flex: 1, minWidth: 0 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  cardMeta: { margin: "4px 0 0", fontSize: "13px", color: "#607d8b" },
  rejectedNote: { margin: "8px 0 0", fontSize: "13px", color: "#b3261e" },
  cardActions: { display: "flex", gap: "8px", marginTop: "12px" },
  editButton: { padding: "6px 12px", fontSize: "12px", fontWeight: 600, background: "#eef5ef", color: "#2e7d32", border: "none", borderRadius: "6px", cursor: "pointer" },
  deleteButton: { padding: "6px 12px", fontSize: "12px", fontWeight: 600, background: "#fdecea", color: "#b3261e", border: "none", borderRadius: "6px", cursor: "pointer" },
  badge: { padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" },
};

export default RehomePet;
