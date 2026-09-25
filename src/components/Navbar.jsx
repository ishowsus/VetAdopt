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

const NAV_AUTH_SIMPLE = [
  { to: "/vets",  label: "Vet Map",    icon: "📍" },
  { to: "/quiz",  label: "Matchmaker", icon: "✨" },
];

const ADOPT_CATEGORIES = [
  { to: "/adopt?type=Dog",    label: "Dogs",    icon: "🐶", blurb: "Loyal companions of every size" },
  { to: "/adopt?type=Cat",    label: "Cats",    icon: "🐱", blurb: "Independent, affectionate housemates" },
  { to: "/adopt?type=Rabbit", label: "Rabbits", icon: "🐰", blurb: "Quiet, gentle indoor pets" },
  { to: "/adopt?type=Bird",   label: "Birds",   icon: "🦜", blurb: "Bright, social feathered friends" },
];

export const NAVBAR_HEIGHT = 64;

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [mobileAdoptOpen, setMobileAdoptOpen] = useState(false);
  const containerRef = useRef(null);
  const adoptCloseTimer = useRef(null);

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
      if (e.key === "Escape") {
        setMobileOpen(false);
        setAdoptOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll while the mobile panel is open
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

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileAdoptOpen(false);
  };

  // Small hover-intent delay so the mega-menu doesn't flicker closed
  // when the cursor crosses the gap between the trigger and the panel.
  const openAdopt = () => {
    clearTimeout(adoptCloseTimer.current);
    setAdoptOpen(true);
  };
  const scheduleCloseAdopt = () => {
    adoptCloseTimer.current = setTimeout(() => setAdoptOpen(false), 150);
  };

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
          position: relative;
        }
        .vet-nav-links a:hover,
        .vet-nav-mobile a:hover {
          color: ${TOKENS.accent} !important;
          background: rgba(232, 160, 32, 0.1) !important;
        }

        /* ---------- Adopt mega-menu trigger ---------- */
        .vet-nav-adopt-wrap { position: relative; }

        .vet-nav-adopt-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: ${TOKENS.text};
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .vet-nav-adopt-trigger:hover,
        .vet-nav-adopt-trigger.open {
          color: ${TOKENS.accent};
          background: rgba(232, 160, 32, 0.1);
        }
        .vet-nav-adopt-chevron {
          transition: transform 0.2s ease;
          font-size: 0.7rem;
        }
        .vet-nav-adopt-trigger.open .vet-nav-adopt-chevron { transform: rotate(180deg); }

        .vet-mega {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: 560px;
          background: #fffaf2;
          border-radius: 16px;
          box-shadow: 0 20px 45px rgba(30, 20, 5, 0.28);
          border: 1px solid rgba(122, 105, 66, 0.15);
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          opacity: 0;
          visibility: hidden;
          transform: translateX(-50%) translateY(-6px);
          transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s;
          z-index: 1001;
        }
        .vet-mega.open {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }

        .vet-mega-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .vet-mega-item:hover { background: rgba(122, 105, 66, 0.08); }

        .vet-mega-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: ${TOKENS.accentLight};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .vet-mega-item-label {
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          color: #2a2314;
          margin: 0 0 2px;
        }

        .vet-mega-item-blurb {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          color: #7a6e58;
          margin: 0;
          line-height: 1.35;
        }

        .vet-mega-featured {
          grid-column: span 2;
          margin-top: 4px;
          padding-top: 16px;
          border-top: 1px solid rgba(122, 105, 66, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .vet-mega-featured-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          color: #5c5240;
        }
        .vet-mega-featured-text strong { color: #2a2314; }
        .vet-mega-featured-cta {
          background: ${TOKENS.green};
          color: #fff;
          padding: 8px 14px;
          border-radius: 10px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.82rem;
          white-space: nowrap;
          transition: opacity 0.2s;
        }
        .vet-mega-featured-cta:hover { opacity: 0.9; }

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

        /* ---------- Mobile: slide-in panel from the right ---------- */
        .vet-nav-mobile-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(20, 14, 4, 0.45);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.22s ease, visibility 0.22s;
          z-index: 999;
        }
        .vet-nav-mobile-backdrop.open { opacity: 1; visibility: visible; }

        .vet-nav-mobile {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 85%;
          max-width: 340px;
          background: linear-gradient(180deg, ${TOKENS.primaryMid} 0%, ${TOKENS.primary} 100%);
          box-shadow: -12px 0 32px rgba(0, 0, 0, 0.35);
          padding: 20px 18px 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transform: translateX(100%);
          transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000;
          overflow-y: auto;
        }
        .vet-nav-mobile.open { transform: translateX(0); }

        .vet-nav-mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .vet-nav-mobile-close {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: ${TOKENS.text};
          width: 34px;
          height: 34px;
          border-radius: 10px;
          font-size: 1.05rem;
          cursor: pointer;
        }

        .vet-nav-mobile-section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: ${TOKENS.textMuted};
          padding: 10px 14px 4px;
        }

        .vet-nav-mobile-adopt-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: none;
          padding: 8px 14px;
          border-radius: 10px;
          color: ${TOKENS.text};
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          cursor: pointer;
        }
        .vet-nav-mobile-adopt-toggle:hover { background: rgba(232, 160, 32, 0.1); color: ${TOKENS.accent}; }
        .vet-nav-mobile-adopt-toggle span.chev {
          transition: transform 0.2s ease;
          font-size: 0.7rem;
        }
        .vet-nav-mobile-adopt-toggle.open span.chev { transform: rotate(180deg); }

        .vet-nav-mobile-adopt-panel {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.22s ease;
          padding-left: 10px;
        }
        .vet-nav-mobile-adopt-panel.open { max-height: 260px; }

        .vet-nav-mobile .vet-nav-donate {
          display: block;
          text-align: center;
          margin-top: 14px;
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
        }

      `}</style>

      <header className="vet-navbar" ref={containerRef}>
        <div className="vet-navbar-inner">
          <NavLink to="/" className="vet-nav-brand" onClick={closeMobile}>
            🐾 <span>VetAdopt</span>
          </NavLink>

          {/* Desktop horizontal links */}
          <nav className="vet-nav-links">
            <NavLink to="/" style={navLinkStyle} end>
              <span>🏠</span><span>Home</span>
            </NavLink>

            {user && (
              <div
                className="vet-nav-adopt-wrap"
                onMouseEnter={openAdopt}
                onMouseLeave={scheduleCloseAdopt}
              >
                <button
                  className={`vet-nav-adopt-trigger${adoptOpen ? " open" : ""}`}
                  onClick={() => setAdoptOpen((o) => !o)}
                  aria-expanded={adoptOpen}
                >
                  <span>🐾</span><span>Adopt</span>
                  <span className="vet-nav-adopt-chevron">▾</span>
                </button>

                <div className={`vet-mega${adoptOpen ? " open" : ""}`}>
                  {ADOPT_CATEGORIES.map(({ to, label, icon, blurb }) => (
                    <NavLink key={to} to={to} className="vet-mega-item" onClick={() => setAdoptOpen(false)}>
                      <span className="vet-mega-icon">{icon}</span>
                      <div>
                        <p className="vet-mega-item-label">{label}</p>
                        <p className="vet-mega-item-blurb">{blurb}</p>
                      </div>
                    </NavLink>
                  ))}

                  <div className="vet-mega-featured">
                    <p className="vet-mega-featured-text">
                      Not sure where to start? <strong>Take the Matchmaker quiz.</strong>
                    </p>
                    <NavLink to="/quiz" className="vet-mega-featured-cta" onClick={() => setAdoptOpen(false)}>
                      Try it ✨
                    </NavLink>
                  </div>
                </div>
              </div>
            )}

            <NavLink to="/about" style={navLinkStyle}>
              <span>ℹ️</span><span>About</span>
            </NavLink>

            {user &&
              NAV_AUTH_SIMPLE.map(({ to, label, icon }) => (
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
            ☰
          </button>
        </div>
      </header>

      {/* Mobile backdrop + slide-in panel (outside <header> so it can sit above everything) */}
      <div className={`vet-nav-mobile-backdrop${mobileOpen ? " open" : ""}`} onClick={closeMobile} />

      <nav className={`vet-nav-mobile${mobileOpen ? " open" : ""}`} aria-hidden={!mobileOpen}>
        <div className="vet-nav-mobile-header">
          <span style={{ color: TOKENS.text, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            🐾 VetAdopt
          </span>
          <button className="vet-nav-mobile-close" onClick={closeMobile} aria-label="Close menu">✕</button>
        </div>

        <NavLink to="/" style={navLinkStyle} end onClick={closeMobile}>
          <span>🏠</span><span>Home</span>
        </NavLink>
        <NavLink to="/about" style={navLinkStyle} onClick={closeMobile}>
          <span>ℹ️</span><span>About</span>
        </NavLink>

        {user && (
          <>
            <button
              className={`vet-nav-mobile-adopt-toggle${mobileAdoptOpen ? " open" : ""}`}
              onClick={() => setMobileAdoptOpen((o) => !o)}
              aria-expanded={mobileAdoptOpen}
            >
              <span>🐾 Adopt</span>
              <span className="chev">▾</span>
            </button>
            <div className={`vet-nav-mobile-adopt-panel${mobileAdoptOpen ? " open" : ""}`}>
              {ADOPT_CATEGORIES.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} style={navLinkStyle} onClick={closeMobile}>
                  <span>{icon}</span><span>{label}</span>
                </NavLink>
              ))}
            </div>

            {NAV_AUTH_SIMPLE.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} style={navLinkStyle} onClick={closeMobile}>
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}

        {!user && (
          <>
            <div className="vet-nav-mobile-section-label">Account</div>
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
    </>
  );
}