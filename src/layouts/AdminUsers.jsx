// src/layouts/AdminUsers.jsx
import React from "react";
// Same directory import
import { useAdmin } from "./AdminContext";

const AdminUsers = () => {
  const { users, loading, updateUserRole, updateUserStatus } = useAdmin();

  if (loading) return <div style={{ padding: "20px" }}>Loading real-time user records...</div>;

  return (
    <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #ede0cc" }}>
      <h2 style={{ color: "#3d2b00", marginBottom: "16px" }}>User Management</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ede0cc", textAlign: "left", color: "#6b4c11" }}>
            <th style={{ padding: "12px" }}>User</th>
            <th style={{ padding: "12px" }}>Presence</th>
            <th style={{ padding: "12px" }}>Role</th>
            <th style={{ padding: "12px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: "16px", textAlign: "center", color: "#7a5c30" }}>
                No registered users found.
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f5ede0" }}>
                <td style={{ padding: "12px" }}>
                  <strong>{u.displayName || u.fullName || "Unnamed User"}</strong>
                  <div style={{ fontSize: "12px", color: "#7a5c30" }}>{u.email}</div>
                </td>
                <td style={{ padding: "12px" }}>
                  <span style={{ color: u.isOnline ? "#2d6a4f" : "#999", fontWeight: "600" }}>
                    {u.isOnline ? "● Online" : "○ Offline"}
                  </span>
                </td>
                <td style={{ padding: "12px" }}>
                  <select
                    value={u.role || "User"}
                    onChange={(e) => updateUserRole(u.id, e.target.value)}
                    style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ede0cc" }}
                  >
                    <option value="User">User</option>
                    <option value="ShelterStaff">Shelter Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td style={{ padding: "12px" }}>
                  <select
                    value={u.status || "approved"}
                    onChange={(e) => updateUserStatus(u.id, e.target.value)}
                    style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ede0cc" }}
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsers;