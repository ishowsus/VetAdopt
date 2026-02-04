import { Outlet, NavLink } from "react-router-dom";
import { useState } from "react";

const AdminLayout = () => {
  const [open, setOpen] = useState(false);

  const linkStyle = ({ isActive }) => ({
    padding: "12px 15px",
    borderRadius: "8px",
    textDecoration: "none",
    color: isActive ? "#38bdf8" : "white",
    background: isActive ? "#0f172a" : "transparent",
    transition: "0.2s",
  });

  return (
    <>
      {/* Mobile sidebar toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="sidebar-toggle"
      >
        ☰
      </button>

      <div className="admin-wrapper">
        <aside className={`admin-sidebar ${open ? "open" : ""}`}>
          <h2>Admin Panel</h2>

          <NavLink to="/admin/dashboard" style={linkStyle} onClick={() => setOpen(false)}>Dashboard</NavLink>
          <NavLink to="/admin/users" style={linkStyle} onClick={() => setOpen(false)}>Users</NavLink>
          <NavLink to="/admin/reports" style={linkStyle} onClick={() => setOpen(false)}>Reports</NavLink>
          <NavLink to="/admin/settings" style={linkStyle} onClick={() => setOpen(false)}>Settings</NavLink>
        </aside>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      {/* Inline styles for simplicity */}
      <style>{`
        .admin-wrapper {
          display: flex;
          min-height: 80vh;
        }

        .admin-sidebar {
          width: 240px;
          background: #1e293b;
          color: white;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: transform 0.3s ease;
        }

        .admin-sidebar a:hover {
          background: #0f172a;
        }

        .admin-content {
          flex: 1;
          padding: 20px;
          background: #f1f5f9;
        }

        .sidebar-toggle {
          display: none;
          position: fixed;
          top: 70px;
          left: 10px;
          z-index: 1000;
          font-size: 22px;
          background: #1e293b;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .sidebar-toggle { display: block; }
          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            transform: translateX(-100%);
            z-index: 999;
          }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-wrapper { flex-direction: column; }
        }
      `}</style>
    </>
  );
};

export default AdminLayout;
