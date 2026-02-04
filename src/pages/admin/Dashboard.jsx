import React, { useEffect, useState } from "react";
// Optional: icons for cards
import { FaUsers, FaPaw, FaFileAlt } from "react-icons/fa";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    adoptions: 0,
    reports: 0,
  });

  // Fetch stats from Firestore (example)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const adoptionsSnap = await getDocs(collection(db, "adoptions"));
        const reportsSnap = await getDocs(collection(db, "reports"));

        setStats({
          users: usersSnap.size,
          adoptions: adoptionsSnap.size,
          reports: reportsSnap.size,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Dashboard</h1>
      <p>Overview of the system and quick stats.</p>

      {/* Stats Cards */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 200px",
            padding: "20px",
            background: "#f1f5f9",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <FaUsers size={30} color="#2e7d32" />
          <div>
            <h3>Users</h3>
            <p>{stats.users} registered</p>
          </div>
        </div>

        <div
          style={{
            flex: "1 1 200px",
            padding: "20px",
            background: "#f1f5f9",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <FaPaw size={30} color="#f57f17" />
          <div>
            <h3>Adoptions</h3>
            <p>{stats.adoptions} requests</p>
          </div>
        </div>

        <div
          style={{
            flex: "1 1 200px",
            padding: "20px",
            background: "#f1f5f9",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <FaFileAlt size={30} color="#d32f2f" />
          <div>
            <h3>Reports</h3>
            <p>{stats.reports} pending</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ marginTop: "30px" }}>
        <h2>Quick Links</h2>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginTop: "10px" }}>
          <button
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#2e7d32",
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => window.location.href = "/admin/users"}
          >
            Manage Users
          </button>
          <button
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#f57f17",
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => window.location.href = "/admin/reports"}
          >
            View Reports
          </button>
          <button
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#0288d1",
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => window.location.href = "/admin/settings"}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
