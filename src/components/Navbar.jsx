import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// ─── Shared Design Tokens ─────────────────────────────────────
// Keep these in sync with AdminSidebar.jsx
export const TOKENS = {
  primary:     "#3d2b00",   // deep bark brown
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

const NAV_PUBLIC  = [
  { to: "/",      label: "Home"  },
  { to: "/about", label: "About" },
];
const NAV_AUTH = [
  { to: "/adopt",   label: "Adopt"      },
  { to: "/vets",    label: "Vet Map"    },
  { to: "/quiz",    label: "Matchmaker" },
];

export default function Navbar({ user }) {
  const navigate        = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef         = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close menu on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/");
  };

  const linkStyle = ({ isActive }) => ({
    color:          isActive ? TOKENS.accent : TOKENS.text,
    textDecoration: "none",
    fontSize:       "0.9rem",
    fontWeight:     isActive ? "600" : "400",
    fontFamily:     "'DM Sans', sans-serif",
    letterSpacing:  "0.01em",
    padding:        "4px 0",
    borderBottom:   isActive ? `2px solid ${TOKENS.accent}` : "2px solid transparent",
    transition:     "all 0.2s ease",
  });

  const mobileLinkStyle = ({ isActive }) => ({
    display:        "block",
    padding:        "14px 20px",
    color:          isActive ? TOKENS.accent : TOKENS.text,
    textDecoration: "none",
    fontFamily:     "'DM Sans', sans-serif",
    fontWeight:     isActive ? "600" : "400",
    fontSize:       "1rem",
    borderLeft:     isActive ? `3px solid ${TOKENS.accent}` : "3px solid transparent",
    background:     isActive ? "rgba(232,160,32,0.08)" : "transparent",
    transition:     "all 0.18s ease",
  });

  const allLinks = [
    ...NAV_PUBLIC,
    ...(user ? NAV_AUTH : []),
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

        .navbar {
          background: linear-gradient(90deg, ${TOKENS.primary} 0%, ${TOKENS.primaryMid} 100%);
          box-shadow: 0 2px 16px rgba(61,43,0,0.35);
          position: sticky;
          top: 0;
          z-index: 900;
        }

        .navbar-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: auto;
          padding: 0 24px;
          height: 64px;
        }

        .navbar-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          color: ${TOKENS.text};
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: 0.01em;
          transition: opacity 0.2s;
        }

        .navbar-logo:hover { opacity: 0.85; }

        .navbar-logo-paw {
          font-size: 1.6rem;
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
        }

        /* ── Desktop links ── */
        .navbar-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .navbar-links a:hover {
          color: ${TOKENS.accent} !important;
          border-bottom-color: ${TOKENS.accent} !important;
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${TOKENS.greenLight};
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .navbar-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${TOKENS.green}, ${TOKENS.accent});
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .navbar-logout {
          background: none;
          border: 1px solid rgba(255,255,255,0.35);
          color: ${TOKENS.textMuted};
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .navbar-logout:hover {
          border-color: white;
          color: white;
          background: rgba(255,255,255,0.08);
        }

        .navbar-donate {
          background: ${TOKENS.accent};
          color: ${TOKENS.donateFg};
          padding: 7px 18px;
          border-radius: 20px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.88rem;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(232,160,32,0.4);
        }

        .navbar-donate:hover {
          background: #f5b730;
          box-shadow: 0 4px 16px rgba(232,160,32,0.5);
          transform: translateY(-1px);
        }

        /* ── Hamburger ── */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: background 0.2s;
          z-index: 1001;
        }

        .hamburger:hover { background: rgba(255,255,255,0.1); }

        .hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: ${TOKENS.text};
          border-radius: 2px;
          transition: all 0.3s ease;
          transform-origin: center;
        }

        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ── Mobile drawer overlay ── */
        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 950;
          backdrop-filter: blur(3px);
          animation: fadeIn 0.2s ease;
        }

        .mobile-overlay.show { display: block; }

        /* ── Mobile drawer ── */
        .mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: min(300px, 85vw);
          background: linear-gradient(160deg, ${TOKENS.primary} 0%, #1a1200 100%);
          z-index: 960;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          display: flex;
          flex-direction: column;
          padding-top: 72px;
          box-shadow: -8px 0 32px rgba(0,0,0,0.4);
        }

        .mobile-drawer.open { transform: translateX(0); }

        .mobile-drawer-section {
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .mobile-drawer-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${TOKENS.textMuted};
          padding: 8px 20px 4px;
        }

        .mobile-drawer a:hover {
          color: ${TOKENS.accent} !important;
          background: rgba(232,160,32,0.1) !important;
        }

        .mobile-drawer-footer {
          margin-top: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .mobile-donate {
          display: block;
          text-align: center;
          background: ${TOKENS.accent};
          color: ${TOKENS.donateFg};
          padding: 12px;
          border-radius: 10px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .mobile-logout {
          background: none;
          border: 1px solid rgba(255,255,255,0.2);
          color: ${TOKENS.textMuted};
          padding: 11px;
          border-radius: 10px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          transition: all 0.2s;
          width: 100%;
        }

        .mobile-logout:hover { border-color: white; color: white; }

        .mobile-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .mobile-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${TOKENS.green}, ${TOKENS.accent});
          color: white;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mobile-user-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: ${TOKENS.text};
        }

        .mobile-user-role {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          color: ${TOKENS.textMuted};
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @media (max-width: 768px) {
          .navbar-links { display: none; }
          .hamburger    { display: flex; }
        }

        button:focus-visible, a:focus-visible {
          outline: 2px solid ${TOKENS.accent};
          outline-offset: 2px;
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="navbar" role="banner">
        <div className="navbar-inner">
          {/* Logo */}
          <NavLink to="/" className="navbar-logo" aria-label="VetAdopt home">
            <span className="navbar-logo-paw" aria-hidden="true">🐾</span>
            VetAdopt
          </NavLink>

          {/* Desktop links */}
          <nav className="navbar-links" aria-label="Main navigation">
            {NAV_PUBLIC.map(({ to, label }) => (
              <NavLink key={to} to={to} style={linkStyle} end={to === "/"}>{label}</NavLink>
            ))}

            {user && NAV_AUTH.map(({ to, label }) => (
              <NavLink key={to} to={to} style={linkStyle}>{label}</NavLink>
            ))}

            {user ? (
              <>
                <NavLink to="/profile" style={linkStyle} className="navbar-user" aria-label={`Profile: ${user.name}`}>
                  <div className="navbar-avatar" aria-hidden="true">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {user.name?.split(" ")[0] || "Profile"}
                </NavLink>
                <button onClick={handleLogout} className="navbar-logout" aria-label="Log out">
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login"    style={linkStyle}>Login</NavLink>
                <NavLink to="/register" style={linkStyle}>Register</NavLink>
              </>
            )}

            <NavLink to="/donate" className="navbar-donate" aria-label="Donate to VetAdopt">
              ❤ Donate
            </NavLink>
          </nav>

          {/* Hamburger */}
          <button
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* ── Mobile Overlay ── */}
      <div
        className={`mobile-overlay ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile Drawer ── */}
      <nav
        id="mobile-drawer"
        className={`mobile-drawer ${menuOpen ? "open" : ""}`}
        ref={menuRef}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
      >
        {/* User info if logged in */}
        {user && (
          <div className="mobile-user-info">
            <div className="mobile-avatar" aria-hidden="true">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <div className="mobile-user-name">{user.name || "User"}</div>
              <div className="mobile-user-role">Member</div>
            </div>
          </div>
        )}

        {/* Public links */}
        <div className="mobile-drawer-section">
          <div className="mobile-drawer-label">Navigation</div>
          {NAV_PUBLIC.map(({ to, label }) => (
            <NavLink key={to} to={to} style={mobileLinkStyle} onClick={() => setMenuOpen(false)} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Auth-gated links */}
        {user && (
          <div className="mobile-drawer-section">
            <div className="mobile-drawer-label">My Account</div>
            {NAV_AUTH.map(({ to, label }) => (
              <NavLink key={to} to={to} style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>
                {label}
              </NavLink>
            ))}
            <NavLink to="/profile" style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>
              Profile
            </NavLink>
          </div>
        )}

        {/* Login / Register */}
        {!user && (
          <div className="mobile-drawer-section">
            <div className="mobile-drawer-label">Account</div>
            <NavLink to="/login"    style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>Login</NavLink>
            <NavLink to="/register" style={mobileLinkStyle} onClick={() => setMenuOpen(false)}>Register</NavLink>
          </div>
        )}

        {/* Footer */}
        <div className="mobile-drawer-footer">
          <NavLink to="/donate" className="mobile-donate" onClick={() => setMenuOpen(false)}>
            ❤ Donate
          </NavLink>
          {user && (
            <button onClick={handleLogout} className="mobile-logout">
              Log out
            </button>
          )}
        </div>
      </nav>
    </>
  );
}