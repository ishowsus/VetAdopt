import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../Firebase";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch users from Firestore
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersCollection = collection(db, "users");
      const userSnapshot = await getDocs(usersCollection);
      const usersList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Delete user
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      alert("User deleted!");
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert("Failed to delete user.");
    }
  };

  // Toggle user role
  const toggleRole = async (user) => {
    const newRole = user.role === "admin" ? "adopter" : "admin";
    if (!window.confirm(`Change role of ${user.name} to ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, "users", user.id), { role: newRole });
      alert(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert("Failed to update role.");
    }
  };

  // Filtered users based on search
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1>Users Management</h1>
      <p>View, search, and manage registered users.</p>

      {/* Search box */}
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px",
          width: "100%",
          maxWidth: "400px",
          marginTop: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Name</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Email</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Role</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Created At</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{user.name}</td>
                <td style={{ padding: "10px" }}>{user.email}</td>
                <td style={{ padding: "10px", textTransform: "capitalize" }}>{user.role}</td>
                <td style={{ padding: "10px" }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "10px", display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => toggleRole(user)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#0288d1",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#d32f2f",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Users;
