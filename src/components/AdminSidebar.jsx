// src/components/AdminSidebar.jsx
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, Suspense } from "react";
// Import Context from layouts directory
import { useAdmin } from "../layouts/AdminContext";

// ─── Design Tokens ───────────────────────────────────────────
const T = {
  primary:       "#3d2b00",
  primaryMid:    "#6b4c11",
  primaryLight:  "#8c6520",
  sidebar:       "#2a1d00",
  sidebarBorder: "#3f2e08",
  accent:        "#e8a020",
  accentBg:      "rgba(232,160,32,0.10)",
  green:         "#2d6a4f",
  greenLight:    "#95d5b2",
  text:          "#fdf6ec",
  textMuted:     "#b89a6a",
  groupLabel:    "#7a5c30",
  content:       "#fdf8f2",
  contentDark:   "#1a1200",
  headerBg:      "#ffffff",
  headerBorder:  "#ede0cc",
  iconBtnBg:     "#f5ede0",
};

const ROUTE_TITLES = {
  "/admin/dashboard": "Dashboard",
  "/admin/users":     "Users",
  "/admin/reports":   "Reports",
  "/admin/animals":   "Animals",
  "/admin/settings":  "Settings",
};

const NOTIFICATIONS = [
  { id: 1, text: "New adoption request submitted", time: "3m ago",  unread: true  },
  { id: 2, text: "Vet listing #12 approved",        time: "45m ago", unread: true  },
  { id: 3, text: "Report #9 generated",             time: "2h ago",  unread: false },
  { id: 4, text: "New user registered",             time: "1d ago",  unread: false },
];

const SkeletonLoader = () => (
  <div style={{ padding: "12px" }}>
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{
          height:          i === 1 ? "28px" : "72px",
          borderRadius:   "10px",
          marginBottom:   "16px",
          width:          i === 2 ? "65%" : "100%",
          background:     "linear-gradient(90deg, #ede0cc 25%, #f9f0e3 50%, #ede0cc 75%)",
          backgroundSize: "200% 100%",
          animation:      "vetShimmer 1.5s infinite",
        }}
      />
    ))}
    <style>{`
      @keyframes vetShimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

const AdminSidebar = () => {
  // Consume real-time context data
  const { pendingCount, currentUser } = useAdmin();

  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen,        setNotifOpen]        = useState(false);
  const [notifications,    setNotifications]    = useState(NOTIFICATIONS);

  const notifRef  = useRef(null);
  const location  = useLocation();
  const pageTitle = ROUTE_TITLES[location.pathname] ?? "Admin";
  const unreadCount = notifications.filter((n) => n.unread).length;

  const NAV_GROUPS = [
    {
      label: "Overview",
      links: [{ to: "/admin/dashboard", label: "Dashboard", icon: "▦" }],
    },
    {
      label: "Manage",
      links: [
        { 
          to: "/admin/users",   
          label: "Users",   
          icon: "⊹", 
          badge: pendingCount > 0 ? pendingCount : null 
        },
        { to: "/admin/reports", label: "Reports", icon: "◈" },
        { to: "/admin/animals", label: "Animals", icon: "🐾" },
      ],
    },
    {
      label: "System",
      links: [{ to: "/admin/settings", label: "Settings", icon: "◎" }],
    },
  ];

  const crumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1),
      path:  "/" + arr.slice(0, i + 1).join("/"),
    }));

  useEffect(() => {
    setSidebarOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { 
        setSidebarOpen(false); 
        setNotifOpen(false); 
      }
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

  const linkStyle = ({ isActive }) => ({
    display:        "flex",
    alignItems:     "center",
    gap:            sidebarCollapsed ? "0" : "10px",
    justifyContent: sidebarCollapsed ? "center" : "flex-start",
    padding:        "9px 12px",
    borderRadius:   "8px",
    textDecoration: "none",
    color:          isActive ? T.accent : T.textMuted,
    background:     isActive ? T.accentBg : "transparent",
    fontWeight:     isActive ? "600" : "400",
    fontSize:       "13.5px",
    fontFamily:     "'DM Sans', sans-serif",
    borderLeft:     isActive ? `3px solid ${T.accent}` : "3px solid transparent",
    transition:     "all 0.18s ease",
    whiteSpace:     "nowrap",
    overflow:       "hidden",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .vet-admin-wrapper { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: ${T.content}; }
        .vet-sidebar { width: 224px; background: ${T.sidebar}; border-right: 1px solid ${T.sidebarBorder}; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow: hidden; flex-shrink: 0; transition: width 0.25s ease, transform 0.3s ease; }
        .vet-sidebar.collapsed { width: 64px; }
        .vet-sidebar-header { display: flex; align-items: center; gap: 10px; padding: 18px 14px; border-bottom: 1px solid ${T.sidebarBorder}; flex-shrink: 0; }
        .vet-logo-mark { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, ${T.accent}, ${T.green}); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(232,160,32,0.35); }
        .vet-brand { font-family: 'Playfair Display', serif; font-size: 15px; color: ${T.text}; letter-spacing: 0.02em; flex: 1; }
        .vet-brand span { display: block; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: ${T.textMuted}; margin-top: 1px; }
        .vet-collapse-btn { background: none; border: none; color: ${T.groupLabel}; cursor: pointer; padding: 4px 6px; border-radius: 4px; font-size: 13px; flex-shrink: 0; transition: all 0.15s; display: none; }
        .vet-collapse-btn:hover { background: rgba(255,255,255,0.08); color: ${T.text}; }
        .vet-nav { flex: 1; overflow-y: auto; padding: 8px 0; }
        .vet-nav-group { padding: 8px 10px 4px; }
        .vet-nav-group-label { display: block; font-size: 9.5px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${T.groupLabel}; padding: 0 4px; margin-bottom: 4px; }
        .vet-sidebar a:hover { background: rgba(232,160,32,0.08) !important; color: ${T.text} !important; }
        .vet-nav-icon { font-size: 15px; flex-shrink: 0; width: 20px; text-align: center; }
        .vet-nav-label { flex: 1; }
        .vet-nav-badge { font-size: 9px; font-weight: 700; color: ${T.primary}; background: ${T.accent}; padding: 1px 6px; border-radius: 20px; }
        .vet-sidebar-user { display: flex; align-items: center; gap: 10px; padding: 14px; border-top: 1px solid ${T.sidebarBorder}; }
        .vet-user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${T.green}, ${T.accent}); color: white; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .vet-user-info { flex: 1; overflow: hidden; }
        .vet-user-name { font-size: 13px; font-weight: 600; color: ${T.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vet-user-role { font-size: 11px; color: ${T.textMuted}; }
        .vet-logout-btn { background: none; border: none; color: ${T.textMuted}; cursor: pointer; font-size: 15px; padding: 4px; border-radius: 4px; transition: all 0.15s; }
        .vet-logout-btn:hover { color: ${T.text}; background: rgba(255,255,255,0.08); }
        .vet-admin-right { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .vet-admin-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 28px; background: ${T.headerBg}; border-bottom: 1px solid ${T.headerBorder}; position: sticky; top: 0; z-index: 100; flex-shrink: 0; }
        .vet-breadcrumbs { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #999; }
        .vet-crumb-link { color: #999; text-decoration: none; transition: color 0.15s; }
        .vet-crumb-link:hover { color: ${T.primaryMid}; }
        .vet-crumb { display: flex; align-items: center; gap: 6px; }
        .vet-crumb:last-child { color: ${T.primary}; font-weight: 500; }
        .vet-header-actions { display: flex; align-items: center; gap: 8px; }
        .vet-icon-btn { position: relative; width: 36px; height: 36px; border-radius: 9px; border: none; background: ${T.iconBtnBg}; color: ${T.primaryMid}; font-size: 15px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.18s; }
        .vet-icon-btn:hover { background: #eddfc7; transform: translateY(-1px); }
        .vet-notif-dot { position: absolute; top: 5px; right: 5px; width: 8px; height: 8px; background: #e53935; border-radius: 50%; border: 2px solid ${T.headerBg}; }
        .vet-notif-panel { position: absolute; top: calc(100% + 8px); right: 0; width: 310px; background: white; border: 1px solid ${T.headerBorder}; border-radius: 14px; box-shadow: 0 8px 32px rgba(61,43,0,0.12); overflow: hidden; z-index: 300; animation: vetFadeDown 0.15s ease; }
        @keyframes vetFadeDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .vet-notif-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid ${T.headerBorder}; }
        .vet-notif-title { font-weight: 600; font-size: 14px; color: ${T.primary}; }
        .vet-notif-mark-btn { background: none; border: none; color: ${T.accent}; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .vet-notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5ede0; transition: background 0.15s; }
        .vet-notif-item:hover { background: #fdf8f2; }
        .vet-notif-item:last-child { border-bottom: none; }
        .vet-notif-unread-dot { width: 7px; height: 7px; border-radius: 50%; background: ${T.accent}; flex-shrink: 0; margin-top: 5px; }
        .vet-notif-text { font-size: 13px; color: #333; margin: 0; line-height: 1.4; }
        .vet-notif-time { font-size: 11px; color: #999; margin: 2px 0 0; }
        .vet-page-title-bar { padding: 18px 28px 16px; background: white; border-bottom: 1px solid ${T.headerBorder}; flex-shrink: 0; }
        .vet-page-title { font-family: 'Playfair Display', serif; font-size: 22px; color: ${T.primary}; font-weight: 700; }
        .vet-admin-content { flex: 1; padding: 28px; overflow-y: auto; background: ${T.content}; }
        .vet-sidebar-toggle { display: none; position: fixed; top: 16px; left: 16px; z-index: 1100; width: 40px; height: 40px; background: ${T.sidebar}; color: ${T.text}; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; align-items: center; justify-content: center; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
        .vet-sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 998; backdrop-filter: blur(2px); }
        @media (min-width: 769px) { .vet-collapse-btn { display: flex; } }
        @media (max-width: 768px) {
          .vet-sidebar-toggle { display: flex; }
          .vet-sidebar-overlay { display: block; }
          .vet-sidebar { position: fixed; top: 0; left: 0; height: 100vh; width: 224px !important; transform: translateX(-100%); z-index: 999; box-shadow: 4px 0 24px rgba(0,0,0,0.35); }
          .vet-sidebar.open { transform: translateX(0); }
          .vet-admin-header { padding: 12px 16px 12px 64px; }
          .vet-page-title-bar { padding: 14px 16px; }
          .vet-admin-content { padding: 16px; }
        }
      `}</style>

      <button
        className="vet-sidebar-toggle"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {sidebarOpen && (
        <div
          className="vet-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="vet-admin-wrapper">
        <aside
          id="vet-admin-sidebar"
          className={`vet-sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}
        >
          <div className="vet-sidebar-header">
            <div className="vet-logo-mark">🐾</div>
            {!sidebarCollapsed && (
              <div className="vet-brand">
                VetAdopt
                <span>Admin Panel</span>
              </div>
            )}
            <button
              className="vet-collapse-btn"
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              {sidebarCollapsed ? "»" : "«"}
            </button>
          </div>

          <nav className="vet-nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="vet-nav-group">
                {!sidebarCollapsed && (
                  <span className="vet-nav-group-label">{group.label}</span>
                )}
                {group.links.map(({ to, label, icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    style={linkStyle}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <span className="vet-nav-icon">{icon}</span>
                    {!sidebarCollapsed && <span className="vet-nav-label">{label}</span>}
                    {!sidebarCollapsed && badge && (
                      <span className="vet-nav-badge">{badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div
            className="vet-sidebar-user"
            style={{ justifyContent: sidebarCollapsed ? "center" : "flex-start" }}
          >
            <div className="vet-user-avatar">
              {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "A"}
            </div>
            {!sidebarCollapsed && (
              <div className="vet-user-info">
                <div className="vet-user-name">
                  {currentUser?.displayName || currentUser?.email || "Admin User"}
                </div>
                <div className="vet-user-role">Super Admin</div>
              </div>
            )}
          </div>
        </aside>

        <div className="vet-admin-right">
          <header className="vet-admin-header">
            <nav className="vet-breadcrumbs">
              {crumbs.map((c, i) => (
                <span key={c.path} className="vet-crumb">
                  {i > 0 && <span>/</span>}
                  {i === crumbs.length - 1 ? (
                    <span>{c.label}</span>
                  ) : (
                    <Link to={c.path} className="vet-crumb-link">
                      {c.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            <div className="vet-header-actions">
              <div style={{ position: "relative" }} ref={notifRef}>
                <button
                  className="vet-icon-btn"
                  onClick={() => setNotifOpen((o) => !o)}
                >
                  🔔
                  {unreadCount > 0 && <span className="vet-notif-dot" />}
                </button>

                {notifOpen && (
                  <div className="vet-notif-panel">
                    <div className="vet-notif-header">
                      <span className="vet-notif-title">Notifications</span>
                      {unreadCount > 0 && (
                        <button className="vet-notif-mark-btn" onClick={markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="vet-notif-item"
                        style={{ background: n.unread ? "#fffbf3" : "white" }}
                      >
                        {n.unread && <span className="vet-notif-unread-dot" />}
                        <div>
                          <p className="vet-notif-text">{n.text}</p>
                          <p className="vet-notif-time">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="vet-page-title-bar">
            <h1 className="vet-page-title">{pageTitle}</h1>
          </div>

          <main className="vet-admin-content" id="main-content">
            <Suspense fallback={<SkeletonLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;