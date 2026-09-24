import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import LogoutModal from "../components/LogoutModal";

const NAV_ITEMS = [
  { to: "/shelter/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/shelter/pets", label: "My Pets", icon: "🐾" },
  { to: "/shelter/adoption-requests", label: "Adoption Requests", icon: "📄" },
  { to: "/shelter/donations", label: "Donations", icon: "💰" },
  { to: "/shelter/profile", label: "Profile", icon: "👤" },
];

function ShelterLayout() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

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

  // Close the mobile dropdown on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll while the mobile dropdown is open (mobile only —
  // on desktop the navbar is always visible so scrolling stays free)
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div style={styles.shell}>
      <style>{`
        @media (max-width: 768px) {
          .shelter-nav-links { display: none !important; }
          .shelter-desktop-logout { display: none !important; }
          .shelter-menu-toggle { display: inline-flex !important; }
          .shelter-mobile-nav {
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            background: #1b5e20;
            z-index: 40;
            border-top: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 12px 24px rgba(0,0,0,0.25);
          }
          .shelter-nav-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 39;
          }
        }
        @media (min-width: 769px) {
          .shelter-menu-toggle { display: none !important; }
        }
      `}</style>

      {/* ── Top Navbar (desktop: full bar / mobile: brand + ☰) ── */}
      <header className="shelter-navbar" style={styles.navbar}>
        <div style={styles.navbarInner}>
          <span style={styles.navbarBrand}>🏡 Shelter Portal</span>

          {/* Desktop links */}
          <nav className="shelter-nav-links" style={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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

          <div style={styles.navbarRight}>
            {/* Desktop logout */}
            <button
              className="shelter-desktop-logout"
              style={styles.logoutButton}
              onClick={() => setLogoutOpen(true)}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "⎋ Log Out"}
            </button>

            {/* Mobile ☰ toggle */}
            <button
              className="shelter-menu-toggle"
              style={styles.menuToggle}
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown — slides under the bar; backdrop dims the page */}
      {menuOpen && (
        <div
          className="shelter-nav-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}
      {menuOpen && (
        <nav className="shelter-mobile-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                ...styles.mobileNavLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <button
            style={styles.mobileLogout}
            onClick={() => setLogoutOpen(true)}
            disabled={signingOut}
          >
            {signingOut ? "Signing out..." : "⎋ Log Out"}
          </button>
        </nav>
      )}

      {/* Logout confirmation lightbox */}
      <LogoutModal
        open={logoutOpen}
        busy={signingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />

      <main className="shelter-content" style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },

  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "#1b5e20",
    borderBottom: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
  },

  navbarInner: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    padding: "0 24px",
    height: "64px",
  },

  navbarBrand: {
    fontWeight: 700,
    fontSize: "19px",
    letterSpacing: "0.3px",
    color: "#fff",
    whiteSpace: "nowrap",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: 1,
    overflowX: "auto",
  },

  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.85)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "background 0.15s ease",
  },

  navLinkActive: {
    background: "#2e7d32",
    color: "#fff",
    fontWeight: 600,
  },

  navIcon: {
    fontSize: "18px",
  },

  navbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginLeft: "auto",
  },

  logoutButton: {
    padding: "8px 16px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  menuToggle: {
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    border: "none",
    background: "transparent",
    fontSize: "22px",
    cursor: "pointer",
    color: "#fff",
  },

  mobileNavLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 20px",
    color: "rgba(255,255,255,0.85)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 500,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  mobileLogout: {
    margin: "12px 16px 16px",
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

export default ShelterLayout;
