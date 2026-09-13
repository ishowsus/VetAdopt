import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// ─── Shared Design Tokens ─────────────────────────────────────
export const TOKENS = {
  primary:     "#7a6942",   // deep bark brown
  primaryMid:  "#6b4c11",   // warm walnut
  accent:      "#e8a020",   // golden amber
  accentLight: "#fef3c7",   // soft cream
  green:       "#2d6a4f",   // forest green
  greenLight:  "#95d5b2",   // mint
  text:        "#fdf6ec",   // warm white
  textMuted:   "#d4b896",   // muted sand
  donate:      "#e8a020",
  donateFg:    "#3d2b00",
};

const NAV_PUBLIC = [
  { to: "/",      label: "Home",       icon: "🏠" },
  { to: "/about",  label: "About",      icon: "ℹ️" },
];

const NAV_AUTH = [
  { to: "/adopt",  label: "Adopt",      icon: "🐾" },
  { to: "/vets",   label: "Vet Map",    icon: "📍" },
  { to: "/quiz",   label: "Matchmaker", icon: "✨" },
];

export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Persist sidebar collapsed/hidden state across pages
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  
  const drawerRef = useRef(null);

  // Sync global CSS variable for desktop layout adjustment
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "72px" : "260px"
    );
  }, [collapsed]);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem("sidebarCollapsed", String(nextState));
      return nextState;
    });
  };

  // Close mobile drawer on outside click
  useEffect(() => {
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    setMobileOpen(false);
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/");
  };

  const getProfilePath = () => {
    if (!user) return "/login";
    switch (user.role?.toLowerCase()) {
      case "shelter": return "/Shelter/ShelterDashboard";
      case "vet":     return "/Veterinarian/VetDashboard";
      case "admin":   return "/admin/Dashboard";
      default:        return "/profile";
    }
  };

  const navLinkStyle = ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: collapsed ? "12px 0" : "12px 16px",
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: "12px",
    color: isActive ? TOKENS.accent : TOKENS.text,
    background: isActive ? "rgba(232, 160, 32, 0.12)" : "transparent",
    borderLeft: !collapsed && isActive ? `4px solid ${TOKENS.accent}` : "4px solid transparent",
    textDecoration: "none",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: isActive ? "600" : "400",
    fontSize: "0.95rem",
    transition: "all 0.2s ease",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

        /* ── Desktop Sidebar Fixed ── */
        .sidebar-desktop {
          width: var(--sidebar-width, ${collapsed ? "72px" : "260px"});
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          background: linear-gradient(180deg, ${TOKENS.primary} 0%, ${TOKENS.primaryMid} 100%);
          display: flex;
          flex-direction: column;
          padding: ${collapsed ? "24px 8px" : "24px 16px"};
          z-index: 900;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: ${collapsed ? "center" : "space-between"};
          padding: 8px 4px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 16px;
        }

        .sidebar-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          color: ${TOKENS.text};
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-toggle-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: ${TOKENS.text};
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sidebar-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar-nav a:hover {
          color: ${TOKENS.accent} !important;
          background: rgba(232, 160, 32, 0.08) !important;
        }

        .sidebar-section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${TOKENS.textMuted};
          padding: 16px 16px 6px;
          text-align: ${collapsed ? "center" : "left"};
        }

        /* Footer Section */
        .sidebar-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sidebar-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          justify-content: ${collapsed ? "center" : "flex-start"};
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          text-decoration: none;
          transition: background 0.2s;
        }

        .sidebar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${TOKENS.green}, ${TOKENS.accent});
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-user-name {
          color: ${TOKENS.text};
          font-size: 0.9rem;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-role {
          color: ${TOKENS.textMuted};
          font-size: 0.75rem;
          font-family: 'DM Sans', sans-serif;
        }

        .sidebar-btn-donate {
          background: ${TOKENS.accent};
          color: ${TOKENS.donateFg};
          text-align: center;
          padding: 10px;
          border-radius: 10px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .sidebar-btn-logout {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: ${TOKENS.textMuted};
          padding: 8px;
          border-radius: 10px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        /* Mobile Layout */
        .mobile-header {
          display: none;
          position: sticky;
          top: 0;
          height: 60px;
          background: ${TOKENS.primary};
          padding: 0 16px;
          justify-content: space-between;
          align-items: center;
          z-index: 899;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        }

        .mobile-hamburger {
          background: none;
          border: none;
          color: ${TOKENS.text};
          font-size: 1.5rem;
          cursor: pointer;
        }

        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 950;
        }

        .mobile-overlay.show { display: block; }

        @media (max-width: 768px) {
          .sidebar-desktop {
            width: 260px !important;
            padding: 24px 16px !important;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 960;
          }
          .sidebar-desktop.mobile-open {
            transform: translateX(0);
          }
          .mobile-header {
            display: flex;
          }
          .sidebar-toggle-btn {
            display: none;
          }
        }
      `}</style>

      {/* Mobile Top Navigation Header */}
      <div className="mobile-header">
        <NavLink to="/" className="sidebar-logo">
          <span>🐾</span> VetAdopt
        </NavLink>
        <button
          className="mobile-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation"
        >
          ☰
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`mobile-overlay ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside
        ref={drawerRef}
        className={`sidebar-desktop ${mobileOpen ? "mobile-open" : ""}`}
      >
        {/* Header with Hide/Expand Toggle Button */}
        <div className="sidebar-header">
          {!collapsed && (
            <NavLink to="/" className="sidebar-logo" onClick={() => setMobileOpen(false)}>
              <span>🐾</span> VetAdopt
            </NavLink>
          )}

          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title={collapsed ? "Expand Sidebar" : "Hide Sidebar"}
          >
            {collapsed ? "❯" : "❮"}
          </button>
        </div>

        {/* Links Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">{collapsed ? "•" : "Menu"}</div>
          {NAV_PUBLIC.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={navLinkStyle}
              end={to === "/"}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <span>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {user && (
            <>
              <div className="sidebar-section-label">{collapsed ? "•" : "Explore"}</div>
              {NAV_AUTH.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  style={navLinkStyle}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? label : undefined}
                >
                  <span>{icon}</span>
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </>
          )}

          {!user && (
            <>
              <div className="sidebar-section-label">{collapsed ? "•" : "Account"}</div>
              <NavLink to="/login" style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Login">
                <span>🔑</span>
                {!collapsed && <span>Login</span>}
              </NavLink>
              <NavLink to="/register" style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Register">
                <span>📝</span>
                {!collapsed && <span>Register</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* User Card & Donate Section */}
        <div className="sidebar-footer">
          <NavLink
            to="/donate"
            className="sidebar-btn-donate"
            onClick={() => setMobileOpen(false)}
          >
            {collapsed ? "❤" : "❤ Donate"}
          </NavLink>

          {user && (
            <>
              <NavLink
                to={getProfilePath()}
                className="sidebar-user-card"
                onClick={() => setMobileOpen(false)}
                title={collapsed ? user.name : undefined}
              >
                <div className="sidebar-avatar">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                {!collapsed && (
                  <div className="sidebar-user-info">
                    <span className="sidebar-user-name">{user.name || "User Account"}</span>
                    <span className="sidebar-user-role">{user.role || "Member"}</span>
                  </div>
                )}
              </NavLink>

              <button
                onClick={handleLogout}
                className="sidebar-btn-logout"
                title={collapsed ? "Log out" : undefined}
              >
                {collapsed ? "🚪" : "Log Out"}
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}