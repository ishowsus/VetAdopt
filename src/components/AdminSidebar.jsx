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
      {/* Inline styles so everything stays in one file */}
      <style>{`
        .admin-container {
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

        .admin-content {
          flex: 1;
          padding: 20px;
        }

        @media (max-width: 768px) {
          .sidebar-toggle {
            display: block;
          }

          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            transform: translateX(-100%);
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .admin-container {
            flex-direction: column;
          }
        }
      `}</style>

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="sidebar-toggle"
      >
        ☰
      </button>

      <div className="admin-container">
        <aside className={`admin-sidebar ${open ? "open" : ""}`}>
          <h2>Admin</h2>

          <NavLink to="/admin/dashboard" style={linkStyle}>
            Dashboard
          </NavLink>

          <NavLink to="/admin/users" style={linkStyle}>
            Users
          </NavLink>

          <NavLink to="/admin/reports" style={linkStyle}>
            Reports
          </NavLink>

          <NavLink to="/admin/settings" style={linkStyle}>
            Settings
          </NavLink>
        </aside>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default AdminLayout;
