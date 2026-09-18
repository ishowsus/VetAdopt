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

export default function DropdownSidebar({ user }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
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
    padding: "10px 14px",
    borderRadius: "10px",
    color: isActive ? TOKENS.accent : TOKENS.text,
    background: isActive ? "rgba(232, 160, 32, 0.12)" : "transparent",
    borderLeft: isActive ? `3px solid ${TOKENS.accent}` : "3px solid transparent",
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

        .dropdown-menu-container {
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 1000;
        }

        .dropdown-toggle-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, ${TOKENS.primary} 0%, ${TOKENS.primaryMid} 100%);
          color: ${TOKENS.text};
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 10px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .dropdown-toggle-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .dropdown-panel {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 280px;
          max-height: calc(100vh - 90px);
          overflow-y: auto;
          background: linear-gradient(180deg, ${TOKENS.primary} 0%, ${TOKENS.primaryMid} 100%);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: dropDownSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes dropDownSlide {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .sidebar-section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${TOKENS.textMuted};
          padding: 10px 14px 4px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-nav a:hover {
          color: ${TOKENS.accent} !important;
          background: rgba(232, 160, 32, 0.08) !important;
        }

        .sidebar-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sidebar-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          text-decoration: none;
          transition: background 0.2s;
        }

        .sidebar-user-card:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .sidebar-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${TOKENS.green}, ${TOKENS.accent});
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-user-name {
          color: ${TOKENS.text};
          font-size: 0.85rem;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-user-role {
          color: ${TOKENS.textMuted};
          font-size: 0.72rem;
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
          transition: opacity 0.2s;
        }

        .sidebar-btn-donate:hover {
          opacity: 0.9;
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

        .sidebar-btn-logout:hover {
          background: rgba(255, 255, 255, 0.08);
          color: ${TOKENS.text};
        }
      `}</style>

      <div className="dropdown-menu-container" ref={containerRef}>
        {/* Dropdown Toggle Button */}
        <button
          className="dropdown-toggle-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label="Toggle Menu"
        >
          <span>🐾</span>
          <span>Menu</span>
          <span style={{ fontSize: "0.75rem", marginLeft: "4px" }}>
            {isOpen ? "▲" : "▼"}
          </span>
        </button>

        {/* Floating Dropdown Panel */}
        {isOpen && (
          <div className="dropdown-panel">
            <nav className="sidebar-nav">
              <div className="sidebar-section-label">Menu</div>
              {NAV_PUBLIC.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  style={navLinkStyle}
                  end={to === "/"}
                  onClick={() => setIsOpen(false)}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}

              {user && (
                <>
                  <div className="sidebar-section-label">Explore</div>
                  {NAV_AUTH.map(({ to, label, icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      style={navLinkStyle}
                      onClick={() => setIsOpen(false)}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </>
              )}

              {!user && (
                <>
                  <div className="sidebar-section-label">Account</div>
                  <NavLink
                    to="/login"
                    style={navLinkStyle}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>🔑</span>
                    <span>Login</span>
                  </NavLink>
                  <NavLink
                    to="/register"
                    style={navLinkStyle}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>📝</span>
                    <span>Register</span>
                  </NavLink>
                </>
              )}
            </nav>

            {/* Footer Actions */}
            <div className="sidebar-footer">
              <NavLink
                to="/donate"
                className="sidebar-btn-donate"
                onClick={() => setIsOpen(false)}
              >
                ❤ Donate
              </NavLink>

              {user && (
                <>
                  <NavLink
                    to={getProfilePath()}
                    className="sidebar-user-card"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="sidebar-avatar">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="sidebar-user-info">
                      <span className="sidebar-user-name">
                        {user.name || "User Account"}
                      </span>
                      <span className="sidebar-user-role">
                        {user.role || "Member"}
                      </span>
                    </div>
                  </NavLink>

                  <button className="sidebar-btn-logout" onClick={handleLogout}>
                    Log Out
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}