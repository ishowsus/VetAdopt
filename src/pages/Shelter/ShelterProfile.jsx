import React, { useState, useEffect } from "react";
import { db, auth } from "../../Firebase";
import { supabase } from "../../supabase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2, Upload } from "lucide-react";

export default function ShelterProfile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
    logoUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view this profile.");
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfile({
          name: data.name || data.shelterName || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          address: data.address || "",
          description: data.description || "",
          logoUrl: data.logoUrl || data.photoUrl || "",
        });
      }
    } catch (err) {
      console.error("Error fetching shelter profile:", err);
      setError("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

  // Supabase public URLs look like:
  // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // Extract the storage path so we can delete the old file after a successful upload.
  const getSupabasePathFromPublicUrl = (publicUrl, bucket) => {
    if (!publicUrl) return null;
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in to upload a logo.");
      return;
    }

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError("Please upload a PNG, JPEG, WEBP, or GIF image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo image must be smaller than 5MB.");
      e.target.value = "";
      return;
    }

    setUploadingLogo(true);
    setError("");
    setNotice("");

    const BUCKET = "shelter-assets";
    const previousLogoUrl = profile.logoUrl;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logos/${user.uid}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      await setDoc(doc(db, "users", user.uid), { logoUrl: publicUrl }, { merge: true });
      setProfile((prev) => ({ ...prev, logoUrl: publicUrl }));
      setNotice("Logo uploaded and updated successfully.");

      // Best-effort cleanup of the old logo file so storage doesn't grow unbounded.
      // Non-fatal if it fails - the new logo is already live either way.
      const oldPath = getSupabasePathFromPublicUrl(previousLogoUrl, BUCKET);
      if (oldPath) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([oldPath]);
        if (removeError) {
          console.warn("Could not remove old logo file:", removeError);
        }
      }
    } catch (err) {
      console.error("Error uploading logo:", err);
      setError("Failed to upload logo image.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // setDoc + merge (rather than updateDoc) so this doesn't throw for shelters
      // whose "users" doc hasn't been created yet (e.g. right after signup).
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          description: profile.description,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setNotice("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        Shelter Profile
      </h2>

      {notice && (
        <div style={{ backgroundColor: "#d1fae5", color: "#065f46", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
          {notice}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
            }}
          >
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt="Shelter Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No Logo</span>
            )}
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "#fff",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {uploadingLogo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            Upload Logo
            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} disabled={uploadingLogo} />
          </label>
        </div>

        <div>
          <label htmlFor="shelter-name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Shelter Name</label>
          <input
            id="shelter-name"
            type="text"
            name="name"
            value={profile.name}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
            required
          />
        </div>

        <div>
          <label htmlFor="shelter-email" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Email</label>
          <input
            id="shelter-email"
            type="email"
            value={profile.email}
            disabled
            style={{ width: "100%", padding: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", borderRadius: "6px" }}
          />
        </div>

        <div>
          <label htmlFor="shelter-phone" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Phone Number</label>
          <input
            id="shelter-phone"
            type="text"
            name="phone"
            value={profile.phone}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </div>

        <div>
          <label htmlFor="shelter-address" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Address</label>
          <input
            id="shelter-address"
            type="text"
            name="address"
            value={profile.address}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </div>

        <div>
          <label htmlFor="shelter-description" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Description</label>
          <textarea
            id="shelter-description"
            name="description"
            rows={4}
            value={profile.description}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.75rem",
            backgroundColor: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "500",
            cursor: "pointer",
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {saving && <Loader2 className="animate-spin" size={16} />}
          Save Changes
        </button>
      </form>
    </div>
  );
}