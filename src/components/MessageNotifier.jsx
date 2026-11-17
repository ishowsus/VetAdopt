import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";

/*
 * One message box and notification bell for every role, mounted once in App.jsx:
 *   <MessageNotifier user={user} />
 * It shows unread messages, other notifications (bookings, donations, verification…),
 * pops up a toast when a new message arrives, and gives admins a task list.
 *
 * Back buttons:
 *  - A floating "Back" pill (top-left) on every page except the home/auth pages.
 *  - A back arrow inside the panel when viewing the full Messages or Updates list.
 */

const initialsOf = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const ago = (ts) => {
  const d = ts?.toDate?.();
  if (!d) return "";
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

/* ---------- tiny inline icons (no emoji, they follow the theme colour) ---------- */
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IconBell = () => (<Svg size={24}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>);
const IconBack = ({ size }) => (<Svg size={size}><path d="M15 18l-6-6 6-6" /></Svg>);
const IconClose = () => (<Svg size={18}><path d="M18 6 6 18M6 6l12 12" /></Svg>);
const IconChat = () => (<Svg><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>);
const IconShield = () => (<Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></Svg>);
const IconPaw = () => (<Svg><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="4" cy="8" r="2" /><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></Svg>);
const IconChevron = () => (<Svg size={16}><path d="m9 18 6-6-6-6" /></Svg>);
const IconCheck = () => (<Svg size={16}><path d="M20 6 9 17l-5-5" /></Svg>);

export default function MessageNotifier({ user }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onMessagesPage = /\/messages\/?$/.test(pathname);
  const here = useRef(false);
  here.current = onMessagesPage;

  // Pages where a "Back" pill makes no sense.
  const hideBack = ["/", "/login", "/signup", "/register"].includes(pathname.replace(/\/+$/, "") || "/");

  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const inbox = role.startsWith("vet") ? "/vet/messages" : role === "shelter" ? "/shelter/messages" : "/messages";

  const [uid, setUid] = useState(null);
  const [convs, setConvs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [notifs, setNotifs] = useState([]);
  const [admin, setAdmin] = useState({ verifications: 0, listings: 0 });
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("home"); // "home" | "messages" | "updates"
  const [toast, setToast] = useState(null);
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");

  const requested = useRef(new Set());
  const initial = useRef(true);
  const prevUnread = useRef({});
  const toastTimer = useRef(null);
  const baseTitle = useRef(typeof document !== "undefined" ? document.title : "");

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid || null)), []);

  const loadProfile = async (id) => {
    if (requested.current.has(id)) return;
    requested.current.add(id);
    try {
      const s = await getDoc(doc(db, "users", id));
      const d = s.exists() ? s.data() : {};
      const photo = d.role === "shelter" ? d.logoUrl || d.photoURL : d.photoURL || d.logoUrl;
      setProfiles((p) => ({ ...p, [id]: { name: d.shelterName || d.clinicName || d.name || d.displayName || "Someone", photo: photo || "" } }));
    } catch {
      setProfiles((p) => ({ ...p, [id]: { name: "Someone", photo: "" } }));
    }
  };

  const closePanel = () => {
    setOpen(false);
    setView("home");
  };

  const goTo = (otherId) => {
    closePanel();
    setToast(null);
    navigate(otherId ? `${inbox}?with=${otherId}` : inbox);
  };

  // Go back one page in history; fall back to home if there is nothing to go back to.
  const goBack = () => {
    closePanel();
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  // Conversations: unread counts, plus a toast and desktop alert when a new message arrives.
  useEffect(() => {
    if (!uid) return undefined;
    initial.current = true;
    prevUnread.current = {};
    const q = query(collection(db, "conversations"), where("participants", "array-contains", uid));
    return onSnapshot(
      q,
      (snap) => {
        if (!initial.current) {
          snap.docChanges().forEach((ch) => {
            if (ch.type === "removed") return;
            const d = ch.doc.data();
            const mine = d.unread?.[uid] || 0;
            const before = prevUnread.current[ch.doc.id] || 0;
            if (d.lastSenderId && d.lastSenderId !== uid && mine > before && !here.current) {
              const other = d.participants.find((p) => p !== uid);
              loadProfile(other);
              setToast({ id: ch.doc.id, other, text: d.lastMessage || "New message" });
              clearTimeout(toastTimer.current);
              toastTimer.current = setTimeout(() => setToast(null), 7000);
              if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
                const n = new Notification("New message on VetAdopt", { body: d.lastMessage || "", tag: ch.doc.id });
                n.onclick = () => {
                  window.focus();
                  goTo(other);
                };
              }
            }
          });
        }
        snap.docs.forEach((d) => {
          prevUnread.current[d.id] = d.data().unread?.[uid] || 0;
        });
        initial.current = false;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.updatedAt?.seconds ?? 9e9) - (a.updatedAt?.seconds ?? 9e9));
        setConvs(list);
        list.forEach((c) => loadProfile(c.participants.find((p) => p !== uid)));
      },
      (e) => console.error(e)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Other notifications (bookings, donations, verification, listings…). Message ones are covered above.
  useEffect(() => {
    if (!uid) return undefined;
    const q = query(collection(db, "notifications"), where("userId", "==", uid));
    return onSnapshot(
      q,
      (snap) =>
        setNotifs(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((n) => n.type !== "message")
            .sort((a, b) => (b.createdAt?.seconds ?? 9e9) - (a.createdAt?.seconds ?? 9e9))
        ),
      (e) => console.error(e)
    );
  }, [uid]);

  // Admin task counts.
  useEffect(() => {
    if (!uid || !isAdmin) return undefined;
    const u1 = onSnapshot(query(collection(db, "verifications"), where("status", "==", "pending")), (s) => setAdmin((a) => ({ ...a, verifications: s.size })), () => {});
    const u2 = onSnapshot(query(collection(db, "pets"), where("status", "==", "Pending Review")), (s) => setAdmin((a) => ({ ...a, listings: s.size })), () => {});
    return () => {
      u1();
      u2();
    };
  }, [uid, isAdmin]);

  const unreadMessages = convs.reduce((sum, c) => sum + (c.unread?.[uid] || 0), 0);
  const unreadNotifs = notifs.filter((n) => n.read === false).length;
  const adminTasks = isAdmin ? admin.verifications + admin.listings : 0;
  const total = unreadMessages + unreadNotifs + adminTasks;

  useEffect(() => {
    document.title = total > 0 ? `(${total}) ${baseTitle.current}` : baseTitle.current;
  }, [total]);

  // Escape: go back a level inside the panel first, then close it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (view !== "home") setView("home");
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  const markAllRead = async () => {
    const unread = notifs.filter((n) => n.read === false).slice(0, 400);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };
  const markRead = (n) => n.read === false && updateDoc(doc(db, "notifications", n.id), { read: true }).catch(() => {});

  const askDesktop = async () => {
    if (typeof Notification === "undefined") return;
    setPerm(await Notification.requestPermission());
  };

  if (!user || !uid) return null;

  const showBell = !onMessagesPage;
  const headTitle = view === "messages" ? "Messages" : view === "updates" ? "Updates" : "Inbox";

  const renderConv = (c) => {
    const other = c.participants.find((p) => p !== uid);
    const p = profiles[other];
    const unread = c.unread?.[uid] || 0;
    return (
      <button key={c.id} type="button" className={`mn-row ${unread ? "unread" : ""}`} onClick={() => goTo(other)}>
        {p?.photo ? <img className="mn-av" src={p.photo} alt="" /> : <span className="mn-av mn-av-f">{initialsOf(p?.name)}</span>}
        <span className="mn-main">
          <strong>{p?.name || "…"}</strong>
          <span>{c.lastSenderId === uid ? "You: " : ""}{c.lastMessage}</span>
        </span>
        <span className="mn-meta">
          <span className="mn-time">{ago(c.updatedAt)}</span>
          {unread > 0 && <span className="mn-pill">{unread}</span>}
        </span>
      </button>
    );
  };

  const renderNotif = (n) => (
    <button key={n.id} type="button" className={`mn-row ${n.read === false ? "unread" : ""}`} onClick={() => markRead(n)}>
      <span className="mn-main"><span className="mn-wrap">{n.text}</span></span>
      <span className="mn-meta">
        <span className="mn-time">{ago(n.createdAt)}</span>
        {n.read === false && <span className="mn-dot" aria-label="Unread" />}
      </span>
    </button>
  );

  return (
    <>
      <style>{CSS}</style>

      {!hideBack && (
        <button type="button" className="mn-back" onClick={goBack} aria-label="Go back">
          <IconBack size={18} />
          <span>Back</span>
        </button>
      )}

      {showBell && toast && (
        <button type="button" className="mn-toast" onClick={() => goTo(toast.other)} aria-live="polite">
          <span className="mn-toast-ico"><IconChat /></span>
          <span className="mn-toast-body">
            <strong>{profiles[toast.other]?.name || "New message"}</strong>
            <span>{toast.text}</span>
          </span>
        </button>
      )}

      {showBell && (
        <button type="button" className={`mn-fab ${open ? "is-open" : ""}`} onClick={() => (open ? closePanel() : setOpen(true))} aria-expanded={open} aria-label={`Messages and notifications${total ? `, ${total} new` : ""}`}>
          <IconBell />
          {total > 0 && <span className="mn-badge">{total > 99 ? "99+" : total}</span>}
        </button>
      )}

      {showBell && open && (
        <section className="mn-panel" role="dialog" aria-label="Messages and notifications">
          <header className="mn-head">
            {view !== "home" && (
              <button type="button" className="mn-iconbtn" onClick={() => setView("home")} aria-label="Back to inbox">
                <IconBack size={20} />
              </button>
            )}
            <strong className="mn-title">{headTitle}</strong>
            {view === "updates" && unreadNotifs > 0 && (
              <button type="button" className="mn-link small" onClick={markAllRead}>Mark all read</button>
            )}
            <button type="button" className="mn-iconbtn mn-close" onClick={closePanel} aria-label="Close">
              <IconClose />
            </button>
          </header>

          <div className="mn-scroll" key={view}>
            {view === "home" && (
              <>
                {isAdmin && (
                  <div className="mn-sec">
                    <h3>Admin tasks</h3>
                    <button type="button" className="mn-row" onClick={() => { closePanel(); navigate("/admin/verifications"); }}>
                      <span className="mn-ico"><IconShield /></span>
                      <span className="mn-main"><strong>Verification requests</strong><span>{admin.verifications ? `${admin.verifications} waiting for review` : "All caught up"}</span></span>
                      {admin.verifications > 0 ? <span className="mn-pill">{admin.verifications}</span> : <span className="mn-ok"><IconCheck /></span>}
                    </button>
                    <button type="button" className="mn-row" onClick={() => { closePanel(); navigate("/admin/listings"); }}>
                      <span className="mn-ico"><IconPaw /></span>
                      <span className="mn-main"><strong>Pet listings</strong><span>{admin.listings ? `${admin.listings} waiting for approval` : "All caught up"}</span></span>
                      {admin.listings > 0 ? <span className="mn-pill">{admin.listings}</span> : <span className="mn-ok"><IconCheck /></span>}
                    </button>
                  </div>
                )}

                <div className="mn-sec">
                  <h3>Messages {unreadMessages > 0 && <span className="mn-pill">{unreadMessages}</span>}</h3>
                  {convs.length === 0 && <p className="mn-empty">No messages yet.</p>}
                  {convs.slice(0, 5).map(renderConv)}
                  <button type="button" className="mn-more" onClick={() => setView("messages")}>
                    {convs.length > 5 ? `See all ${convs.length} conversations` : "View all messages"} <IconChevron />
                  </button>
                </div>

                <div className="mn-sec">
                  <h3>
                    Updates {unreadNotifs > 0 && <span className="mn-pill">{unreadNotifs}</span>}
                    {unreadNotifs > 0 && <button type="button" className="mn-link small" onClick={markAllRead}>Mark all read</button>}
                  </h3>
                  {notifs.length === 0 && <p className="mn-empty">Nothing new.</p>}
                  {notifs.slice(0, 6).map(renderNotif)}
                  {notifs.length > 6 && (
                    <button type="button" className="mn-more" onClick={() => setView("updates")}>
                      See all {notifs.length} updates <IconChevron />
                    </button>
                  )}
                </div>

                {perm === "default" && (
                  <button type="button" className="mn-desktop" onClick={askDesktop}>
                    <IconBell /> <span>Turn on desktop alerts <small>(works while VetAdopt is open in a tab)</small></span>
                  </button>
                )}
              </>
            )}

            {view === "messages" && (
              <div className="mn-sec">
                {convs.length === 0 && <p className="mn-empty">No messages yet.</p>}
                {convs.map(renderConv)}
                <button type="button" className="mn-more" onClick={() => goTo(null)}>
                  Open full inbox <IconChevron />
                </button>
              </div>
            )}

            {view === "updates" && (
              <div className="mn-sec">
                {notifs.length === 0 && <p className="mn-empty">Nothing new.</p>}
                {notifs.map(renderNotif)}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

const CSS = `
.mn-fab, .mn-panel, .mn-toast, .mn-back {
  --mn-bg: #ffffff; --mn-surface: #f8fafc; --mn-border: #e5e7eb; --mn-text: #0f172a; --mn-muted: #64748b; --mn-faint: #94a3b8;
  --mn-brand: #15803d; --mn-brand-soft: #ecfdf5; --mn-danger: #dc2626; --mn-shadow: 0 18px 50px rgba(15,23,42,.22);
}
@media (prefers-color-scheme: dark) {
  .mn-fab, .mn-panel, .mn-toast, .mn-back {
    --mn-bg: #111827; --mn-surface: #1f2937; --mn-border: #2b3544; --mn-text: #f1f5f9; --mn-muted: #9ca3af; --mn-faint: #6b7280;
    --mn-brand: #22c55e; --mn-brand-soft: rgba(34,197,94,.12); --mn-shadow: 0 18px 50px rgba(0,0,0,.55);
  }
}

/* Floating back pill */
.mn-back { position: fixed; top: 14px; left: 14px; z-index: 940; display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px 8px 8px; border: 1px solid var(--mn-border); border-radius: 999px; background: color-mix(in srgb, var(--mn-bg) 88%, transparent); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); color: var(--mn-text); font: inherit; font-size: .88rem; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(15,23,42,.14); transition: transform .15s ease, box-shadow .15s ease; }
.mn-back:hover { transform: translateX(-2px); box-shadow: 0 8px 22px rgba(15,23,42,.2); }
.mn-back:active { transform: scale(.97); }

/* Bell button */
.mn-fab { position: fixed; left: 18px; bottom: 18px; z-index: 950; width: 56px; height: 56px; border: none; border-radius: 50%; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 26px rgba(21,128,61,.45); transition: transform .18s ease, box-shadow .18s ease; }
.mn-fab:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 14px 30px rgba(21,128,61,.5); }
.mn-fab.is-open { background: linear-gradient(135deg, #1e293b, #0f172a); box-shadow: 0 10px 26px rgba(15,23,42,.45); }
.mn-fab:focus-visible, .mn-row:focus-visible, .mn-iconbtn:focus-visible, .mn-link:focus-visible, .mn-toast:focus-visible, .mn-back:focus-visible, .mn-more:focus-visible, .mn-desktop:focus-visible { outline: 3px solid #22c55e; outline-offset: 2px; }
.mn-badge { position: absolute; top: -3px; right: -3px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--mn-danger); color: #fff; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--mn-bg); }

/* Panel */
.mn-panel { position: fixed; left: 18px; bottom: 86px; z-index: 950; display: flex; flex-direction: column; width: min(392px, calc(100vw - 24px)); max-height: min(620px, calc(100dvh - 110px)); background: var(--mn-bg); border: 1px solid var(--mn-border); border-radius: 22px; box-shadow: var(--mn-shadow); overflow: hidden; color: var(--mn-text); font-family: inherit; transform-origin: bottom left; animation: mn-pop .2s cubic-bezier(.2,.8,.2,1); }
.mn-head { display: flex; align-items: center; gap: 6px; padding: 12px 12px 12px 16px; border-bottom: 1px solid var(--mn-border); background: linear-gradient(180deg, var(--mn-brand-soft), transparent); }
.mn-head .mn-iconbtn:first-child { margin-left: -6px; }
.mn-title { flex: 1; font-size: 1.05rem; letter-spacing: -.01em; }
.mn-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: none; border-radius: 50%; background: transparent; color: var(--mn-muted); cursor: pointer; transition: background .15s ease, color .15s ease; }
.mn-iconbtn:hover { background: var(--mn-surface); color: var(--mn-text); }
.mn-scroll { overflow-y: auto; padding: 4px 8px 12px; overscroll-behavior: contain; animation: mn-fade .18s ease; scrollbar-width: thin; }
.mn-sec { padding: 8px 0; }
.mn-sec + .mn-sec { border-top: 1px solid var(--mn-border); }
.mn-sec h3 { display: flex; align-items: center; gap: 8px; margin: 6px 8px; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--mn-muted); }

/* Rows */
.mn-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 10px; border: none; border-radius: 14px; background: transparent; text-align: left; cursor: pointer; font: inherit; color: inherit; transition: background .15s ease; }
.mn-row:hover { background: var(--mn-surface); }
.mn-row.unread { background: var(--mn-brand-soft); }
.mn-row.unread:hover { background: color-mix(in srgb, var(--mn-brand-soft) 70%, var(--mn-surface)); }
.mn-row.unread .mn-main strong { font-weight: 700; }
.mn-ico { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 12px; background: var(--mn-brand-soft); color: var(--mn-brand); flex-shrink: 0; }
.mn-av { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.mn-av-f { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #22c55e, #15803d); color: #fff; font-weight: 700; font-size: .82rem; }
.mn-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; font-size: .9rem; }
.mn-main span { color: var(--mn-muted); font-size: .8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mn-main .mn-wrap { white-space: normal; color: var(--mn-text); line-height: 1.35; }
.mn-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
.mn-time { font-size: .7rem; color: var(--mn-faint); }
.mn-pill { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: var(--mn-brand); color: #fff; font-size: .72rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.mn-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--mn-brand); }
.mn-ok { color: var(--mn-brand); display: inline-flex; }
.mn-empty { margin: 8px 10px; color: var(--mn-faint); font-size: .85rem; }

/* Links and buttons */
.mn-link { background: none; border: none; color: var(--mn-brand); font: inherit; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
.mn-link:hover { background: var(--mn-brand-soft); }
.mn-link.small { font-size: .74rem; margin-left: auto; text-transform: none; letter-spacing: 0; }
.mn-more { display: flex; align-items: center; justify-content: center; gap: 4px; width: calc(100% - 16px); margin: 6px 8px 0; padding: 9px 12px; border: 1px solid var(--mn-border); border-radius: 12px; background: transparent; color: var(--mn-brand); font: inherit; font-size: .84rem; font-weight: 600; cursor: pointer; transition: background .15s ease; }
.mn-more:hover { background: var(--mn-brand-soft); }
.mn-desktop { display: flex; align-items: center; gap: 10px; margin: 10px 8px 0; padding: 10px 12px; width: calc(100% - 16px); border: 1px dashed color-mix(in srgb, var(--mn-brand) 45%, transparent); border-radius: 14px; background: var(--mn-brand-soft); color: var(--mn-brand); font: inherit; font-size: .83rem; font-weight: 600; cursor: pointer; text-align: left; }
.mn-desktop small { display: block; font-weight: 400; color: var(--mn-muted); font-size: .74rem; }

/* Toast */
.mn-toast { position: fixed; left: 18px; bottom: 86px; z-index: 960; display: flex; align-items: center; gap: 12px; max-width: min(350px, calc(100vw - 36px)); padding: 12px 16px 12px 12px; border: 1px solid var(--mn-border); border-radius: 16px; background: var(--mn-bg); box-shadow: var(--mn-shadow); text-align: left; cursor: pointer; font: inherit; color: var(--mn-text); animation: mn-in .25s ease; }
.mn-toast-ico { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 12px; background: var(--mn-brand-soft); color: var(--mn-brand); flex-shrink: 0; }
.mn-toast-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mn-toast-body span { color: var(--mn-muted); font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@keyframes mn-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes mn-pop { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes mn-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mn-toast, .mn-panel, .mn-scroll { animation: none; } .mn-back, .mn-fab { transition: none; } }
@media (max-width: 480px) { .mn-back span { display: none; } .mn-back { padding: 8px; } }
`;