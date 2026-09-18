import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, Suspense } from "react";

// ─── External Trigger Helper ─────────────────────────────────
// Allows child components or external modules to push notifications
let externalAddNotification = null;

export const triggerNotification = (text) => {
  if (externalAddNotification) {
    externalAddNotification(text);
  } else {
    console.warn("triggerNotification called before AdminLayout mounted.");
  }
};

// ─── Nav Config ───────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Overview",
    links: [
      { to: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    ],
  },
  {
    label: "Management",
    links: [
      { to: "/admin/users",   label: "Users",   icon: "👥", badge: 3 },
      { to: "/admin/reports", label: "Reports", icon: "📑" },
      { to: "/admin/animals", label: "Animals", icon: "🐾" },
    ],
  },
  {
    label: "System",
    links: [
      { to: "/admin/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

const ROUTE_TITLES = {
  "/admin/dashboard": "Dashboard",
  "/admin/users":     "User Management",
  "/admin/reports":   "Analytics & Reports",
  "/admin/animals":   "Animal Listings",
  "/admin/settings":  "System Settings",
};

const INITIAL_NOTIFICATIONS = [
  { id: 1, text: "New adoption request submitted", time: "3m ago",  unread: true  },
  { id: 2, text: "Vet listing #12 approved",       time: "45m ago", unread: true  },
  { id: 3, text: "Report #9 generated",            time: "2h ago",  unread: false },
  { id: 4, text: "New user registered",            time: "1d ago",  unread: false },
];

// ─── Skeleton Loader Component ────────────────────────────────
const SkeletonLoader = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px" }}>
    <div style={{ height: "40px", width: "250px", borderRadius: "8px", background: "var(--bg-card-border)" }} className="animate-pulse" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: "100px", borderRadius: "12px", background: "var(--bg-card-border)" }} className="animate-pulse" />
      ))}
    </div>
    <div style={{ height: "300px", borderRadius: "12px", background: "var(--bg-card-border)" }} className="animate-pulse" />
  </div>
);

// ─── Main Component ───────────────────────────────────────────
const AdminLayout = () => {
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode,         setDarkMode]         = useState(() =>
    localStorage.getItem("adminDarkMode") === "true"
  );
  const [notifOpen,        setNotifOpen]        = useState(false);
  const [notifications,    setNotifications]    = useState(INITIAL_NOTIFICATIONS);

  const notifRef  = useRef(null);
  const location  = useLocation();

  // Attach state update function to external helper
  useEffect(() => {
    externalAddNotification = (text) => {
      setNotifications((prev) => [
        { id: Date.now(), text, time: "Just now", unread: true },
        ...prev,
      ]);
    };
    return () => {
      externalAddNotification = null;
    };
  }, []);

  const matchedRouteKey = Object.keys(ROUTE_TITLES).find((path) =>
    location.pathname.startsWith(path)
  );
  const pageTitle = ROUTE_TITLES[matchedRouteKey] ?? "Admin";
  const unreadCount = notifications.filter((n) => n.unread).length;

  const crumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment, i, arr) => ({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      path:  "/" + arr.slice(0, i + 1).join("/"),
    }));

  useEffect(() => {
    localStorage.setItem("adminDarkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    setSidebarOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setSidebarOpen(false); setNotifOpen(false); }
    };
    const onClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  return (
    <div 
      className={`admin-shell ${darkMode ? "theme-dark" : "theme-light"}`}
      style={{
        "--sidebar-w": sidebarCollapsed ? "72px" : "260px",
        "--bg-main": darkMode ? "#0f172a" : "#f8fafc",
        "--bg-card": darkMode ? "#1e293b" : "#ffffff",
        "--bg-card-border": darkMode ? "#334155" : "#e2e8f0",
        "--sidebar-bg": darkMode ? "#0f172a" : "#1e293b",
        "--text-main": darkMode ? "#f8fafc" : "#0f172a",
        "--text-muted": darkMode ? "#94a3b8" : "#64748b",
        "--accent": "#3b82f6",
        "--accent-hover": "#2563eb",
        "--accent-subtle": darkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)",
      }}
    >
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="mobile-sidebar-toggle"
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? "mobile-open" : ""} ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-brand-container">
          <div className="brand-logo">🐾</div>
          {!sidebarCollapsed && <span className="brand-name">VetAdopt Admin</span>}
          <button
            className="sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? "❯" : "❮"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              {!sidebarCollapsed && <span className="nav-group-title">{group.label}</span>}
              {group.links.map(({ to, label, icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <span className="nav-icon">{icon}</span>
                  {!sidebarCollapsed && <span className="nav-text">{label}</span>}
                  {!sidebarCollapsed && badge ? <span className="nav-badge">{badge}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="sidebar-footer">
          <div className="user-avatar">JD</div>
          {!sidebarCollapsed && (
            <div className="user-details">
              <span className="user-name">Jane Doe</span>
              <span className="user-role">Super Admin</span>
            </div>
          )}
          {!sidebarCollapsed && (
            <button className="logout-btn" title="Log out">
              ↪
            </button>
          )}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <h1 className="page-title">{pageTitle}</h1>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <span key={c.path} className="crumb-item">
                  {i > 0 && <span className="crumb-divider">/</span>}
                  {i === crumbs.length - 1 ? (
                    <span className="crumb-current">{c.label}</span>
                  ) : (
                    <Link to={c.path} className="crumb-link">{c.label}</Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="header-right">
            {/* Quick Search Input */}
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search..." className="search-input" />
              <kbd className="search-shortcut">⌘K</kbd>
            </div>

            {/* Dark Mode Toggle */}
            <button
              className="header-action-btn"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? "☀" : "☾"}
            </button>

            {/* Notification Dropdown Menu */}
            <div className="notif-wrapper" ref={notifRef}>
              <button
                className="header-action-btn"
                onClick={() => setNotifOpen((o) => !o)}
                aria-expanded={notifOpen}
              >
                🔔
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span className="notif-title">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="notif-clear-btn">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.map((n) => (
                      <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`}>
                        {n.unread && <span className="notif-dot" />}
                        <div className="notif-content">
                          <p className="notif-text">{n.text}</p>
                          <span className="notif-time">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="admin-content-area">
          <Suspense fallback={<SkeletonLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <style>{`
        /* Base Shell Styles */
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-main);
          color: var(--text-main);
          font-family: system-ui, -apple-system, sans-serif;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        /* Sidebar Styles */
        .admin-sidebar {
          width: var(--sidebar-w);
          background-color: var(--sidebar-bg);
          border-right: 1px solid var(--bg-card-border);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 40;
          transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-brand-container {
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .brand-logo { font-size: 24px; }
        .brand-name { font-weight: 700; font-size: 16px; color: #ffffff; flex: 1; }
        .sidebar-collapse-toggle {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .sidebar-collapse-toggle:hover { color: #ffffff; background: rgba(255, 255, 255, 0.1); }

        .sidebar-nav { flex: 1; overflow-y: auto; padding: 16px 8px; display: flex; flex-direction: column; gap: 16px; }
        .nav-group-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; padding: 0 12px; font-weight: 600; }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.15s ease;
        }
        .nav-link:hover { color: #ffffff; background: rgba(255, 255, 255, 0.05); }
        .nav-link.active { color: #ffffff; background: var(--accent); font-weight: 600; }
        .nav-icon { font-size: 16px; }
        .nav-badge { background: #ef4444; color: white; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 12px; margin-left: auto; }

        .sidebar-footer {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: white; font-weight: 600; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .user-details { flex: 1; display: flex; flex-direction: column; }
        .user-name { font-size: 14px; font-weight: 600; color: #ffffff; }
        .user-role { font-size: 12px; color: #94a3b8; }
        .logout-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; padding: 4px; }
        .logout-btn:hover { color: #ef4444; }

        /* Main Workspace & Header */
        .admin-main {
          margin-left: var(--sidebar-w);
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          transition: margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-header {
          height: 64px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--bg-card-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .page-title { font-size: 18px; font-weight: 700; margin: 0; }
        .breadcrumbs { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .crumb-divider { margin: 0 6px; }
        .crumb-link { color: var(--text-muted); text-decoration: none; }
        .crumb-link:hover { text-decoration: underline; }
        .crumb-current { color: var(--text-main); font-weight: 500; }

        .header-right { display: flex; align-items: center; gap: 12px; }
        .search-box {
          display: flex;
          align-items: center;
          background: var(--bg-main);
          border: 1px solid var(--bg-card-border);
          border-radius: 8px;
          padding: 6px 12px;
          gap: 8px;
        }
        .search-input { border: none; background: transparent; color: var(--text-main); outline: none; font-size: 13px; width: 140px; }
        .search-shortcut { background: var(--bg-card-border); color: var(--text-muted); font-size: 10px; padding: 2px 4px; border-radius: 4px; }

        .header-action-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--bg-card-border);
          background: var(--bg-card);
          color: var(--text-main);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .header-action-btn:hover { background: var(--bg-main); }
        .notif-badge { position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; font-size: 10px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        /* Notification Dropdown */
        .notif-wrapper { position: relative; }
        .notif-dropdown {
          position: absolute;
          right: 0;
          top: 48px;
          width: 320px;
          background: var(--bg-card);
          border: 1px solid var(--bg-card-border);
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          z-index: 50;
        }
        .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--bg-card-border); }
        .notif-title { font-size: 14px; font-weight: 600; }
        .notif-clear-btn { background: none; border: none; color: var(--accent); font-size: 12px; cursor: pointer; }
        .notif-list { max-height: 280px; overflow-y: auto; }
        .notif-item { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--bg-card-border); align-items: flex-start; }
        .notif-item.unread { background: var(--accent-subtle); }
        .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-top: 4px; flex-shrink: 0; }
        .notif-text { font-size: 13px; margin: 0; }
        .notif-time { font-size: 11px; color: var(--text-muted); }

        /* Content Area */
        .admin-content-area { flex: 1; padding: 24px; max-width: 1600px; width: 100%; box-sizing: border-box; }

        /* Utilities */
        .animate-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* Mobile Controls */
        .mobile-sidebar-toggle { display: none; }
        @media (max-width: 768px) {
          .mobile-sidebar-toggle {
            display: flex;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 50;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--accent);
            color: white;
            border: none;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
          }
          .admin-sidebar { transform: translateX(-100%); width: 260px !important; }
          .admin-sidebar.mobile-open { transform: translateX(0); }
          .admin-main { margin-left: 0 !important; }
          .sidebar-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 35; }
          .search-box { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;