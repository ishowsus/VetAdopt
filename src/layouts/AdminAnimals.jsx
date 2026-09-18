import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

// Styling Tokens matching VetAdopt Admin UI
const T = {
  primary: "#3d2b00",
  primaryMid: "#6b4c11",
  accent: "#e8a020",
  accentBg: "rgba(232,160,32,0.10)",
  green: "#2d6a4f",
  red: "#c92a2a",
  border: "#ede0cc",
  bgLight: "#fdf8f2",
};

const INITIAL_FORM_STATE = {
  name: "",
  type: "Dog",
  breed: "",
  age: "",
  gender: "Male",
  status: "Available",
  description: "",
  imageUrl: "",
};

const AdminAnimals = () => {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 1. Real-time Listener for Pets Collection
  useEffect(() => {
    const petsRef = collection(db, "pets");
    const unsubscribe = onSnapshot(
      petsRef,
      (snapshot) => {
        const petList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAnimals(petList);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore pets fetch error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle Form Inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Open Modal for Create or Edit
  const handleOpenModal = (animal = null) => {
    if (animal) {
      setEditingId(animal.id);
      setFormData(animal);
    } else {
      setEditingId(null);
      setFormData(INITIAL_FORM_STATE);
    }
    setImageFile(null);
    setModalOpen(true);
  };

  // 2. Create or Update Pet Record
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let finalImageUrl = formData.imageUrl;

      // Handle Image Upload if a new file is chosen
      if (imageFile) {
        const storageRef = ref(storage, `pets/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const payload = {
        ...formData,
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "pets", editingId), payload);
      } else {
        await addDoc(collection(db, "pets"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      setModalOpen(false);
      setFormData(INITIAL_FORM_STATE);
      setImageFile(null);
    } catch (err) {
      console.error("Error saving animal record:", err);
      alert("Failed to save record. Check permissions.");
    } finally {
      setUploading(false);
    }
  };

  // 3. Delete Pet Record
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this animal record?")) {
      try {
        await deleteDoc(doc(db, "pets", id));
      } catch (err) {
        console.error("Error deleting document:", err);
      }
    }
  };

  if (loading) {
    return <div style={{ padding: "24px", color: T.primaryMid }}>Loading animal listings...</div>;
  }

  return (
    <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: `1px solid ${T.border}` }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ color: T.primary, margin: 0 }}>Animal Listings</h2>
          <p style={{ color: T.primaryMid, fontSize: "13px", margin: "4px 0 0" }}>
            Manage shelter pets available for adoption.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            background: T.primary,
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          + Add New Animal
        </button>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${T.border}`, textAlign: "left", color: T.primaryMid }}>
            <th style={{ padding: "12px" }}>Pet</th>
            <th style={{ padding: "12px" }}>Type & Breed</th>
            <th style={{ padding: "12px" }}>Age & Gender</th>
            <th style={{ padding: "12px" }}>Status</th>
            <th style={{ padding: "12px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {animals.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#999" }}>
                No animals currently registered. Click "+ Add New Animal" to create one.
              </td>
            </tr>
          ) : (
            animals.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f5ede0" }}>
                <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src={item.imageUrl || "https://via.placeholder.com/48?text=Pet"}
                    alt={item.name}
                    style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", background: T.bgLight }}
                  />
                  <strong>{item.name}</strong>
                </td>
                <td style={{ padding: "12px" }}>
                  <div>{item.type}</div>
                  <div style={{ fontSize: "12px", color: "#7a5c30" }}>{item.breed || "Mixed"}</div>
                </td>
                <td style={{ padding: "12px" }}>
                  {item.age ? `${item.age} yrs` : "N/A"} • {item.gender}
                </td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: item.status === "Available" ? T.accentBg : "#f0f0f0",
                      color: item.status === "Available" ? T.primaryMid : "#666",
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  <button
                    onClick={() => handleOpenModal(item)}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.primaryMid,
                      cursor: "pointer",
                      marginRight: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.red,
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal Dialog */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              width: "480px",
              maxWidth: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginTop: 0, color: T.primary }}>
              {editingId ? "Edit Animal" : "Add New Animal"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${T.border}` }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${T.border}` }}
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Breed</label>
                  <input
                    type="text"
                    name="breed"
                    value={formData.breed}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${T.border}` }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Age (Years)</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${T.border}` }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${T.border}` }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${T.border}` }}
                >
                  <option value="Available">Available</option>
                  <option value="Pending">Pending Adoption</option>
                  <option value="Adopted">Adopted</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  style={{ width: "100%", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: `1px solid ${T.border}` }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: T.primary, color: "#fff" }}
                >
                  {uploading ? "Saving..." : "Save Animal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnimals;