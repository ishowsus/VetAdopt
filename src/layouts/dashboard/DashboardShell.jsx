import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { Bell, ChevronsLeft, ChevronsRight, ExternalLink, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { auth } from "../../firebase";
import { Skeleton } from "./ui";
import "./dashboard.css";

// The signed-in user's Firebase uid (null until Firebase has restored the session).
export function useUid() {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid || null)), []);
  return uid;
}

// Total unread count that <MessageNotifier /> broadcasts.
function useInboxCount() {
  const [n, setN] = useState(window.__inboxCount || 0);
  useEffect(() => {
    const on = (e) => setN(e.detail || 0);
    window.addEventListener("inboxCount", on);
    return () => window.removeEventListener("inboxCount", on);
  }, []);
  return n;
}

const initialOf = (s) => (s || "?").trim().charAt(0).toUpperCase();

/**
 * Shared dashboard frame: sidebar, topbar and a rounded content panel.
 *  brand   { name, subtitle, icon: LucideIcon }
 *  groups  [{ label, items: [{ to, label, icon, badge?, end? }] }]
 *  titles  { "/path/prefix": "Page title" }
 *  user    { name, email, role }
 *  theme   optional { dark, onToggle } to show a light/dark switch
 *  vars    optional extra CSS variables for pages that use them
 *  toast   optional short message shown bottom-right
 */
export default function DashboardShell({ brand, groups, titles = {}, user, onLogout, theme, vars, toast }) {
  const { pathname } = useLocation();
  const inbox = useInboxCount();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("dsh-collapsed") === "1"; } catch { return false; }
  });
  const BrandIcon = brand.icon;

  const key = Object.keys(titles).filter((p) => pathname.startsWith(p)).sort((a, b) => b.length - a.length)[0];
  const title = titles[key] || brand.name;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    try { localStorage.setItem("dsh-collapsed", collapsed ? "1" : "0"); } catch { /* storage unavailable */ }
  }, [collapsed]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dsh" data-theme={theme?.dark ? "dark" : "light"} data-collapsed={collapsed ? "true" : "false"} style={vars}>
      <a className="dsh-skip" href="#dsh-main">Skip to content</a>
      <div className={`dsh-backdrop ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      <aside className={`dsh-sidebar ${open ? "open" : ""}`} aria-label={`${brand.name} navigation`}>
        <div className="dsh-brand">
          <div className="dsh-brand-mark">{BrandIcon && <BrandIcon size={20} aria-hidden="true" />}</div>
          <div className="dsh-brand-text">
            <strong>{brand.name}</strong>
            {brand.subtitle && <span>{brand.subtitle}</span>}
          </div>
        </div>

        <nav className="dsh-nav">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="dsh-group-label">{g.label}</p>
              {g.items.map(({ to, label, icon: Icon, badge, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `dsh-link ${isActive ? "active" : ""}`} title={collapsed ? label : undefined}>
                  {Icon && <Icon size={19} aria-hidden="true" />}
                  <span className="dsh-text">{label}</span>
                  {badge > 0 && <span className="dsh-badge" aria-label={`${badge} new`}>{badge > 99 ? "99+" : badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="dsh-user">
          <div className="dsh-avatar" aria-hidden="true">{initialOf(user?.name || user?.email)}</div>
          <div className="dsh-user-info">
            <strong>{user?.name || user?.email || "Account"}</strong>
            <span>{user?.role}</span>
          </div>
          <button type="button" className="dsh-icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="dsh-frame">
        <div className="dsh-panel">
          <header className="dsh-topbar">
            <button type="button" className="dsh-icon-btn dsh-menu-btn" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close navigation" : "Open navigation"}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button type="button" className="dsh-icon-btn dsh-collapse-btn" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
            <div className="dsh-sep" aria-hidden="true" />
            <div className="dsh-crumbs">
              <span>{brand.name}</span>
              <span aria-hidden="true">/</span>
              <h1>{title}</h1>
            </div>

            <div className="dsh-top-right">
              <Link to="/" className="dsh-site-link"><ExternalLink size={16} /><span>View site</span></Link>
              {theme && (
                <button type="button" className="dsh-icon-btn" onClick={theme.onToggle} aria-label={theme.dark ? "Switch to light mode" : "Switch to dark mode"}>
                  {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              )}
              <button type="button" className="dsh-icon-btn" onClick={() => window.dispatchEvent(new Event("toggleInbox"))} aria-label={`Inbox${inbox ? `, ${inbox} new` : ""}`}>
                <Bell size={18} />
                {inbox > 0 && <span className="dsh-dot">{inbox > 99 ? "99+" : inbox}</span>}
              </button>
            </div>
          </header>

          <main id="dsh-main" className="dsh-content" tabIndex={-1}>
            <Suspense fallback={<div className="d-page"><Skeleton w={240} h={34} /><div style={{ height: 16 }} /><Skeleton h={120} /></div>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      {toast && <div className="dsh-toast" role="status">{toast}</div>}
    </div>
  );
}