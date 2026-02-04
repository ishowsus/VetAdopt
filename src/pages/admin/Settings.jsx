import React, { useState, useEffect } from "react";
import { auth, db } from "../../Firebase";
import { updateDoc, doc, getDoc } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";

const Settings = () => {
  const [userData, setUserData] = useState({ name: "", email: "" });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch current user from localStorage or Firestore
  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("user"));
    if (localUser) {
      setUserData({ name: localUser.name, email: localUser.email });
    }
  }, []);

  const handleSave = async () => {
    if (!userData.name || !userData.email) return alert("Name and email cannot be empty");

    setLoading(true);
    try {
      const localUser = JSON.parse(localStorage.getItem("user"));
      const userRef = doc(db, "users", localUser.uid);

      // 1. Update Firestore data
      await updateDoc(userRef, { name: userData.name, email: userData.email });

      // 2. Update Firebase Auth email
      if (localUser.email !== userData.email) {
        await updateEmail(auth.currentUser, userData.email);
      }

      // 3. Update password if provided
      if (password) {
        await updatePassword(auth.currentUser, password);
      }

      // 4. Update localStorage
      localStorage.setItem("user", JSON.stringify({ ...localUser, ...userData }));

      alert("Profile updated successfully!");
      setPassword("");
      window.dispatchEvent(new Event("authChange"));
    } catch (error) {
      console.error(error);
      alert("Failed to update profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h1>Admin Settings</h1>
      <p>Update your profile and account settings.</p>

      <div style={{ marginTop: "20px" }}>
        <label style={{ display: "block", marginBottom: "6px" }}>Full Name</label>
        <input
          type="text"
          value={userData.name}
          onChange={(e) => setUserData({ ...userData, name: e.target.value })}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", marginBottom: "15px" }}
        />

        <label style={{ display: "block", marginBottom: "6px" }}>Email</label>
        <input
          type="email"
          value={userData.email}
          onChange={(e) => setUserData({ ...userData, email: e.target.value })}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", marginBottom: "15px" }}
        />

        <label style={{ display: "block", marginBottom: "6px" }}>New Password</label>
        <input
          type="password"
          placeholder="Leave blank to keep current password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "6px", marginBottom: "20px" }}
        />

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: "12px 20px",
            background: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default Settings;
