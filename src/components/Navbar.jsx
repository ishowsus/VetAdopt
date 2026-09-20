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
  { to: "/about", label: "About",      icon: "ℹ️" },
];

const NAV_AUTH = [
  { to: "/adopt", label: "Adopt",      icon: "🐾" },
  { to: "/vets",  label: "Vet Map",    icon: "📍" },
  { to: "/quiz",  label: "Matchmaker", icon: "✨" },
];

export const NAVBAR_HEIGHT = 64;

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef(null);

  // Close mobile panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile panel on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => {
    setMobileOpen(false);
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/");
  };

  const getProfilePath = () => {
    if (!user) return "/login";
    switch (user.role?.toLowerCase()) {
      case "shelter": return "/shelter/dashboard";
      case "vet":
      case "veterinarian": return "/vet/dashboard";
      case "admin":   return "/admin/dashboard";
      default:        return "/profile";
    }
  };

  const navLinkStyle = ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 14px",
    borderRadius: "10px",
    color: isActive ? TOKENS.accent : TOKENS.text,
    background: isActive ? "rgba(232, 160, 32, 0.14)" : "transparent",
    textDecoration: "none",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: isActive ? "600" : "400",
    fontSize: "0.95rem",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  });

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

        .vet-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: ${NAVBAR_HEIGHT}px;
          z-index: 1000;
          background: linear-gradient(90deg, ${TOKENS.primaryMid} 0%, ${TOKENS.primary} 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 2px 14px rgba(0, 0, 0, 0.25);
        }

        .vet-navbar-inner {
          max-width: 1280px;
          height: 100%;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .vet-nav-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: ${TOKENS.text};
          margin-right: auto;
        }
        .vet-nav-brand:hover { opacity: 0.9; }

        .vet-nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .vet-nav-links a:hover,
        .vet-nav-mobile a:hover {
          color: ${TOKENS.accent} !important;
          background: rgba(232, 160, 32, 0.1) !important;
        }

        .vet-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .vet-nav-donate {
          background: ${TOKENS.accent};
          color: ${TOKENS.donateFg};
          padding: 8px 16px;
          border-radius: 10px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          transition: opacity 0.2s;
        }
        .vet-nav-donate:hover { opacity: 0.9; }

        .vet-nav-login {
          color: ${TOKENS.text};
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          padding: 8px 12px;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .vet-nav-login:hover {
          background: rgba(255, 255, 255, 0.1);
          color: ${TOKENS.accent};
        }

        .vet-nav-register {
          background: ${TOKENS.green};
          color: ${TOKENS.text};
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 8px 16px;
          border-radius: 10px;
          transition: opacity 0.2s;
        }
        .vet-nav-register:hover { opacity: 0.9; }
        .vet-nav-user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px 5px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          text-decoration: none;
          transition: background 0.2s;
        }
        .vet-nav-user-chip:hover { background: rgba(255, 255, 255, 0.16); }

        .vet-nav-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${TOKENS.green}, ${TOKENS.accent});
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          flex-shrink: 0;
        }

        .vet-nav-user-name {
          color: ${TOKENS.text};
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vet-nav-logout {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: ${TOKENS.textMuted};
          padding: 7px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .vet-nav-logout:hover {
          background: rgba(255, 255, 255, 0.1);
          color: ${TOKENS.text};
        }

        .vet-nav-toggle {
          display: none;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: ${TOKENS.text};
          width: 40px;
          height: 40px;
          border-radius: 10px;
          font-size: 1.2rem;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .vet-nav-toggle:hover { background: rgba(255, 255, 255, 0.18); }

        .vet-nav-mobile {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: linear-gradient(180deg, ${TOKENS.primaryMid} 0%, ${TOKENS.primary} 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
          padding: 12px 16px 16px;
          flex-direction: column;
          gap: 4px;
          animation: navSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes navSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .vet-nav-mobile .vet-nav-donate {
          display: block;
          text-align: center;
          margin-top: 8px;
        }

        .vet-nav-mobile-user {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }

        .vet-nav-mobile .vet-nav-logout { flex: 1; }

        @media (max-width: 900px) {
          .vet-nav-links,
          .vet-nav-actions { display: none; }

          .vet-nav-toggle {
            display: inline-flex;
            margin-left: auto;
          }

          .vet-nav-mobile.open { display: flex; }
        }

      `}</style>

      <header className="vet-navbar" ref={containerRef}>
        <div className="vet-navbar-inner">
          <NavLink to="/" className="vet-nav-brand" onClick={closeMobile}>
            🐾 <span>VetAdopt</span>
          </NavLink>

          {/* Desktop horizontal links */}
          <nav className="vet-nav-links">
            {NAV_PUBLIC.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} style={navLinkStyle} end={to === "/"}>
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}

            {user &&
              NAV_AUTH.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} style={navLinkStyle}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
          </nav>

          <div className="vet-nav-actions">
            <NavLink to="/donate" className="vet-nav-donate">
              ❤ Donate
            </NavLink>

            {user ? (
              <>
                <NavLink to={getProfilePath()} className="vet-nav-user-chip">
                  <span className="vet-nav-avatar">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                  <span className="vet-nav-user-name">
                    {user.name || "User Account"}
                  </span>
                </NavLink>
                <button className="vet-nav-logout" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="vet-nav-login">
                  Login
                </NavLink>
                <NavLink to="/register" className="vet-nav-register">
                  Register
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile ☰ toggle */}
          <button
            className="vet-nav-toggle"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown panel */}
        <nav className={`vet-nav-mobile${mobileOpen ? " open" : ""}`}>
          {NAV_PUBLIC.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={navLinkStyle}
              end={to === "/"}
              onClick={closeMobile}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}

          {user &&
            NAV_AUTH.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                style={navLinkStyle}
                onClick={closeMobile}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}

          {!user && (
            <>
              <NavLink to="/login" style={navLinkStyle} onClick={closeMobile}>
                <span>🔑</span>
                <span>Login</span>
              </NavLink>
              <NavLink to="/register" style={navLinkStyle} onClick={closeMobile}>
                <span>📝</span>
                <span>Register</span>
              </NavLink>
            </>
          )}

          <NavLink to="/donate" className="vet-nav-donate" onClick={closeMobile}>
            ❤ Donate
          </NavLink>

          {user && (
            <div className="vet-nav-mobile-user">
              <NavLink
                to={getProfilePath()}
                className="vet-nav-user-chip"
                onClick={closeMobile}
              >
                <span className="vet-nav-avatar">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </span>
                <span className="vet-nav-user-name">
                  {user.name || "User Account"}
                </span>
              </NavLink>
              <button className="vet-nav-logout" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          )}
        </nav>

      </header>
    </>
  );
}
