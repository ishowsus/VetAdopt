import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../Firebase";

const NAV_ITEMS = [
  { to: "/vet/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/vet/patients", label: "Patients", icon: "🐶" },
  { to: "/vet/appointments", label: "Appointments", icon: "📅" },
  { to: "/vet/medical-records", label: "Medical Records", icon: "📋" },
  { to: "/vet/profile", label: "Profile", icon: "🩺" },
];

function VetLayout() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      // Keep App.jsx state in sync — Firebase signOut alone leaves
      // localStorage.user set, so the session would survive a page refresh.
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange"));
      navigate("/login");
    } catch (error) {
      console.error(error);
      setSigningOut(false);
    }
  };

  return (
    <div style={styles.shell}>
      <style>{`
        @media (max-width: 768px) {
          .vet-mobile-bar { display: flex !important; }
          .vet-sidebar {
            position: fixed !important;
            left: -260px;
            top: 0;
            z-index: 40;
            transition: left 0.2s ease;
            box-shadow: 4px 0 24px rgba(0,0,0,0.2);
          }
          .vet-sidebar.open { left: 0; }
          .vet-content { padding-top: 64px; }
        }
      `}</style>

      {/* Mobile top bar */}
      <div className="vet-mobile-bar" style={styles.mobileBar}>
        <span style={styles.mobileBrand}>🐾 VetPortal</span>
        <button
          style={styles.mobileToggle}
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>
      </div>

      <aside
        className={`vet-sidebar${sidebarOpen ? " open" : ""}`}
        style={styles.sidebar}
      >
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🐾</span>
          <span style={styles.brandText}>VetPortal</span>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          style={styles.logoutButton}
          onClick={handleLogout}
          disabled={signingOut}
        >
          {signingOut ? "Signing out..." : "⎋ Log Out"}
        </button>
      </aside>

      <main className="vet-content" style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },

  mobileBar: {
    display: "none",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "56px",
    background: "#1b5e20",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    zIndex: 50,
  },

  mobileBrand: {
    fontWeight: 700,
    fontSize: "18px",
    color: "#fff",
  },

  mobileToggle: {
    border: "none",
    background: "transparent",
    fontSize: "22px",
    cursor: "pointer",
    color: "#fff",
  },

  sidebar: {
    width: "240px",
    flexShrink: 0,
    background: "#1b5e20",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    position: "sticky",
    top: 0,
    height: "100vh",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 8px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.15)",
    marginBottom: "16px",
  },

  brandIcon: {
    fontSize: "26px",
  },

  brandText: {
    fontSize: "19px",
    fontWeight: 700,
    letterSpacing: "0.3px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },

  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.85)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 500,
    transition: "background 0.15s ease",
  },

  navLinkActive: {
    background: "#2e7d32",
    color: "#fff",
    fontWeight: 600,
  },

  navIcon: {
    fontSize: "18px",
    width: "22px",
    textAlign: "center",
  },

  logoutButton: {
    marginTop: "16px",
    padding: "12px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },

  content: {
    flex: 1,
    minWidth: 0,
  },
};

export default VetLayout;