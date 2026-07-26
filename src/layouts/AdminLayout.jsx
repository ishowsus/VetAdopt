import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, Suspense } from "react";

// ─── Nav Config ───────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Overview",
    links: [
      { to: "/admin/dashboard", label: "Dashboard", icon: "▦" },
    ],
  },
  {
    label: "Manage",
    links: [
      { to: "/admin/users",   label: "Users",   icon: "⊹", badge: 3 },
      { to: "/admin/reports", label: "Reports", icon: "◈" },
    ],
  },
  {
    label: "System",
    links: [
      { to: "/admin/settings", label: "Settings", icon: "◎" },
    ],
  },
];

const ROUTE_TITLES = {
  "/admin/dashboard": "Dashboard",
  "/admin/users":     "Users",
  "/admin/reports":   "Reports",
  "/admin/settings":  "Settings",
};

const NOTIFICATIONS = [
  { id: 1, text: "New user registered",       time: "2m ago",  unread: true  },
  { id: 2, text: "Report #42 generated",      time: "1h ago",  unread: true  },
  { id: 3, text: "Settings updated",          time: "3h ago",  unread: false },
  { id: 4, text: "Server backup completed",   time: "1d ago",  unread: false },
];

// ─── Skeleton Loader ──────────────────────────────────────────
const SkeletonLoader = () => (
  <div style={{ padding: "8px" }}>
    {[...Array(3)].map((_, i) => (
      <div key={i} style={{
        height: i === 0 ? "32px" : "80px",
        borderRadius: "10px",
        background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        marginBottom: "16px",
        width: i === 1 ? "70%" : "100%",
      }} />
    ))}
    <style>{`
      @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
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
  const [notifications,    setNotifications]    = useState(NOTIFICATIONS);

  const location  = useLocation();
  const pageTitle = ROUTE_TITLES[location.pathname] ?? "Admin";
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Breadcrumbs from pathname
  const crumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment, i, arr) => ({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      path:  "/" + arr.slice(0, i + 1).join("/"),
    }));

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem("adminDarkMode", darkMode);
  }, [darkMode]);

  // Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setSidebarOpen(false); setNotifOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Body scroll lock on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  // ── Theming ──
  const t = {
    sidebar:         darkMode ? "#0d1117" : "#111827",
    sidebarBorder:   darkMode ? "#21262d" : "#1f2937",
    sidebarText:     darkMode ? "#8b949e" : "#9ca3af",
    sidebarActive:   darkMode ? "#58a6ff" : "#38bdf8",
    sidebarActiveBg: darkMode ? "rgba(88,166,255,0.1)" : "rgba(56,189,248,0.1)",
    header:          darkMode ? "#161b22" : "#ffffff",
    headerBorder:    darkMode ? "#30363d" : "#e2e8f0",
    content:         darkMode ? "#0d1117" : "#f8fafc",
    text:            darkMode ? "#e6edf3" : "#0f172a",
    textMuted:       darkMode ? "#8b949e" : "#64748b",
    card:            darkMode ? "#161b22" : "#ffffff",
    cardBorder:      darkMode ? "#30363d" : "#e2e8f0",
    notifBg:         darkMode ? "#161b22" : "#ffffff",
    notifBorder:     darkMode ? "#30363d" : "#e2e8f0",
    groupLabel:      darkMode ? "#484f58" : "#94a3b8",
    iconBtnBg:       darkMode ? "#21262d" : "#f1f5f9",
  };

  const linkStyle = ({ isActive }) => ({
    display:        "flex",
    alignItems:     "center",
    gap:            sidebarCollapsed ? "0" : "10px",
    justifyContent: sidebarCollapsed ? "center" : "flex-start",
    padding:        "10px 12px",
    borderRadius:   "8px",
    textDecoration: "none",
    color:          isActive ? t.sidebarActive : t.sidebarText,
    background:     isActive ? t.sidebarActiveBg : "transparent",
    fontWeight:     isActive ? "600" : "400",
    fontSize:       "14px",
    borderLeft:     isActive ? `3px solid ${t.sidebarActive}` : "3px solid transparent",
    transition:     "all 0.18s ease",
    whiteSpace:     "nowrap",
    overflow:       "hidden",
    position:       "relative",
  });

  return (
    <>
      {/* ── Mobile toggle ── */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="sidebar-toggle"
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={sidebarOpen}
        aria-controls="admin-sidebar"
        style={{ background: t.sidebar }}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {/* ── Overlay ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="admin-wrapper" style={{ background: t.content }}>

        {/* ════ SIDEBAR ════ */}
        <aside
          id="admin-sidebar"
          className={`admin-sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}
          aria-label="Admin navigation"
          style={{ background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}` }}
        >
          {/* Logo */}
          <div className="sidebar-header">
            <div className="sidebar-logo-wrap">
              <span className="sidebar-logo">⬡</span>
            </div>
            {!sidebarCollapsed && (
              <span className="sidebar-brand" style={{ color: "#f9fafb" }}>
                AdminOS
              </span>
            )}
            <button
              className="collapse-btn"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{ color: t.sidebarText }}
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              {sidebarCollapsed ? "»" : "«"}
            </button>
          </div>

          {/* Nav Groups */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="nav-group">
                {!sidebarCollapsed && (
                  <span className="nav-group-label" style={{ color: t.groupLabel }}>
                    {group.label}
                  </span>
                )}
                {group.links.map(({ to, label, icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    style={linkStyle}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <span className="nav-icon" aria-hidden="true">{icon}</span>
                    {!sidebarCollapsed && <span className="nav-label">{label}</span>}
                    {!sidebarCollapsed && badge ? (
                      <span className="nav-badge" style={{ background: t.sidebarActive }}>
                        {badge}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* User Profile */}
          <div
            className="sidebar-user"
            style={{
              borderTop:      `1px solid ${t.sidebarBorder}`,
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
            }}
          >
            <div className="user-avatar" aria-hidden="true">JD</div>
            {!sidebarCollapsed && (
              <div className="user-info">
                <span className="user-name" style={{ color: "#f9fafb" }}>Jane Doe</span>
                <span className="user-role" style={{ color: t.sidebarText }}>Super Admin</span>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                className="logout-btn"
                title="Log out"
                aria-label="Log out"
                style={{ color: t.sidebarText }}
              >
                ↪
              </button>
            )}
          </div>
        </aside>

        {/* ════ RIGHT PANEL ════ */}
        <div className="admin-right">

          {/* ── Header ── */}
          <header
            className="admin-header"
            style={{
              background:   t.header,
              borderBottom: `1px solid ${t.headerBorder}`,
            }}
          >
            <nav aria-label="Breadcrumb" className="breadcrumbs">
              {crumbs.map((c, i) => (
                <span key={c.path} className="crumb" style={{ color: i === crumbs.length - 1 ? t.text : t.textMuted }}>
                  {i > 0 && <span className="crumb-sep" style={{ color: t.textMuted }}>/</span>}
                  {c.label}
                </span>
              ))}
            </nav>

            <div className="header-actions">
              {/* Dark mode toggle */}
              <button
                className="icon-btn"
                onClick={() => setDarkMode((d) => !d)}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                style={{ color: t.textMuted, background: t.iconBtnBg }}
                title={darkMode ? "Light mode" : "Dark mode"}
              >
                {darkMode ? "☀" : "☾"}
              </button>

              {/* Notifications */}
              <div style={{ position: "relative" }}>
                <button
                  className="icon-btn"
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label={`Notifications, ${unreadCount} unread`}
                  aria-expanded={notifOpen}
                  style={{ color: t.textMuted, background: t.iconBtnBg }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="notif-dot" aria-hidden="true">{unreadCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="notif-panel"
                    style={{ background: t.notifBg, border: `1px solid ${t.notifBorder}` }}
                    role="dialog"
                    aria-label="Notifications"
                  >
                    <div className="notif-header" style={{ borderBottom: `1px solid ${t.notifBorder}` }}>
                      <span style={{ color: t.text, fontWeight: 600, fontSize: "14px" }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          style={{ color: t.sidebarActive, fontSize: "12px", background: "none", border: "none", cursor: "pointer" }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="notif-item"
                        style={{
                          background:   n.unread ? (darkMode ? "rgba(88,166,255,0.06)" : "rgba(56,189,248,0.05)") : "transparent",
                          borderBottom: `1px solid ${t.notifBorder}`,
                        }}
                      >
                        {n.unread && <span className="notif-unread-dot" style={{ background: t.sidebarActive }} />}
                        <div>
                          <p style={{ color: t.text, fontSize: "13px", margin: 0 }}>{n.text}</p>
                          <p style={{ color: t.textMuted, fontSize: "11px", margin: "2px 0 0" }}>{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Page Title ── */}
          <div
            className="page-title-bar"
            style={{ borderBottom: `1px solid ${t.headerBorder}`, background: t.header }}
          >
            <h1 style={{ color: t.text, margin: 0, fontSize: "22px", fontWeight: 700 }}>
              {pageTitle}
            </h1>
          </div>

          {/* ── Main Content ── */}
          <main
            className="admin-content"
            id="main-content"
            style={{ background: t.content, color: t.text }}
          >
            <Suspense fallback={<SkeletonLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      {/* ════ STYLES ════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .admin-wrapper {
          display: flex;
          min-height: 100vh;
          font-family: 'IBM Plex Sans', sans-serif;
        }

        /* ── Sidebar ── */
        .admin-sidebar {
          width: 220px;
          display: flex;
          flex-direction: column;
          transition: width 0.25s ease, transform 0.3s ease;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          flex-shrink: 0;
        }

        .admin-sidebar.collapsed { width: 64px; }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 14px 16px;
          flex-shrink: 0;
        }

        .sidebar-logo-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sidebar-logo { font-size: 16px; color: white; }

        .sidebar-brand {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.04em;
          flex: 1;
        }

        .collapse-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 6px;
          border-radius: 4px;
          flex-shrink: 0;
          transition: background 0.15s;
          display: none;
        }

        .collapse-btn:hover { background: rgba(255,255,255,0.1); }

        .nav-group { padding: 8px 10px 4px; }

        .nav-group-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0 4px;
          margin-bottom: 4px;
        }

        .nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
        .nav-label { flex: 1; }

        .nav-badge {
          font-size: 10px;
          font-weight: 700;
          color: white;
          padding: 1px 6px;
          border-radius: 20px;
          min-width: 18px;
          text-align: center;
        }

        .admin-sidebar a:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #f9fafb !important;
        }

        /* ── User Profile ── */
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          margin-top: auto;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        .user-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role { font-size: 11px; }

        .logout-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.15s;
          flex-shrink: 0;
        }

        .logout-btn:hover { background: rgba(255,255,255,0.1); }

        /* ── Right panel ── */
        .admin-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        /* ── Header ── */
        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
          flex-shrink: 0;
        }

        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
        }

        .crumb { display: flex; align-items: center; gap: 4px; }
        .crumb-sep { margin: 0 2px; }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-btn {
          position: relative;
          border: none;
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.15s;
        }

        .icon-btn:hover { opacity: 0.75; }

        .notif-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #ef4444;
          color: white;
          font-size: 9px;
          font-weight: 700;
          border-radius: 20px;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
        }

        /* ── Notification Panel ── */
        .notif-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 300px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          overflow: hidden;
          z-index: 200;
          animation: fadeDown 0.15s ease;
        }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
        }

        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
        }

        .notif-unread-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }

        /* ── Page title bar ── */
        .page-title-bar {
          padding: 16px 24px 14px;
          flex-shrink: 0;
        }

        /* ── Content ── */
        .admin-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        /* ── Mobile toggle ── */
        .sidebar-toggle {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 1100;
          font-size: 18px;
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 998;
          backdrop-filter: blur(2px);
        }

        @media (min-width: 769px) {
          .collapse-btn { display: flex; }
        }

        @media (max-width: 768px) {
          .sidebar-toggle  { display: flex; }
          .sidebar-overlay { display: block; }

          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            transform: translateX(-100%);
            z-index: 999;
            width: 220px !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          }

          .admin-sidebar.open { transform: translateX(0); }
          .admin-header       { padding: 12px 16px 12px 64px; }
          .page-title-bar     { padding: 14px 16px; }
          .admin-content      { padding: 16px; }
        }

        button:focus-visible, a:focus-visible {
          outline: 2px solid #38bdf8;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
};

export default AdminLayout;