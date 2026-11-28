// FILE: src/components/MessageNotifier.jsx
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

export default function MessageNotifier({ user }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onMessagesPage = /\/messages\/?$/.test(pathname);
  const isDash = /^\/(admin|vet|shelter)(\/|$)/.test(pathname); // dashboards have their own topbar bell
  const here = useRef(false);
  here.current = onMessagesPage;

  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const inbox = role.startsWith("vet") ? "/vet/messages" : role === "shelter" ? "/shelter/messages" : "/messages";

  const [uid, setUid] = useState(null);
  const [convs, setConvs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [notifs, setNotifs] = useState([]);
  const [admin, setAdmin] = useState({ verifications: 0, listings: 0 });
  const [open, setOpen] = useState(false);
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

  const goTo = (otherId) => {
    setOpen(false);
    setToast(null);
    navigate(otherId ? `${inbox}?with=${otherId}` : inbox);
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

  // Lets the dashboard topbar bell open this panel and show the same count.
  useEffect(() => {
    window.__inboxCount = total;
    window.dispatchEvent(new CustomEvent("inboxCount", { detail: total }));
  }, [total]);
  useEffect(() => {
    const toggle = () => !here.current && setOpen((v) => !v);
    window.addEventListener("toggleInbox", toggle);
    return () => window.removeEventListener("toggleInbox", toggle);
  }, []);

  useEffect(() => {
    document.title = total > 0 ? `(${total}) ${baseTitle.current}` : baseTitle.current;
  }, [total]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  if (!user || !uid || onMessagesPage) return null;

  return (
    <>
      <style>{CSS}</style>

      {toast && (
        <button type="button" className={`mn-toast ${isDash ? "mn-top" : ""}`} onClick={() => goTo(toast.other)} aria-live="polite">
          <strong>💬 {profiles[toast.other]?.name || "New message"}</strong>
          <span>{toast.text}</span>
        </button>
      )}

      {!isDash && (
        <button type="button" className="mn-fab" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`Messages and notifications${total ? `, ${total} new` : ""}`}>
          🔔
          {total > 0 && <span className="mn-badge">{total > 99 ? "99+" : total}</span>}
        </button>
      )}

      {open && (
        <section className={`mn-panel ${isDash ? "mn-top" : ""}`} role="dialog" aria-label="Messages and notifications">
          <header className="mn-head">
            <strong>Inbox</strong>
            <button type="button" className="mn-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </header>

          <div className="mn-scroll">
            {isAdmin && (
              <div className="mn-sec">
                <h3>Admin tasks</h3>
                <button type="button" className="mn-row" onClick={() => { setOpen(false); navigate("/admin/verifications"); }}>
                  <span className="mn-ico">🛡️</span>
                  <span className="mn-main"><strong>Verification requests</strong><span>{admin.verifications ? `${admin.verifications} waiting for review` : "All caught up"}</span></span>
                  {admin.verifications > 0 && <span className="mn-pill">{admin.verifications}</span>}
                </button>
                <button type="button" className="mn-row" onClick={() => { setOpen(false); navigate("/admin/listings"); }}>
                  <span className="mn-ico">🐾</span>
                  <span className="mn-main"><strong>Pet listings</strong><span>{admin.listings ? `${admin.listings} waiting for approval` : "All caught up"}</span></span>
                  {admin.listings > 0 && <span className="mn-pill">{admin.listings}</span>}
                </button>
              </div>
            )}

            <div className="mn-sec">
              <h3>Messages {unreadMessages > 0 && <span className="mn-pill">{unreadMessages}</span>}</h3>
              {convs.length === 0 && <p className="mn-empty">No messages yet.</p>}
              {convs.slice(0, 5).map((c) => {
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
                    <span className="mn-time">{ago(c.updatedAt)}</span>
                    {unread > 0 && <span className="mn-pill">{unread}</span>}
                  </button>
                );
              })}
              <button type="button" className="mn-link" onClick={() => goTo(null)}>Open all messages →</button>
            </div>

            <div className="mn-sec">
              <h3>
                Updates
                {unreadNotifs > 0 && <button type="button" className="mn-link small" onClick={markAllRead}>Mark all read</button>}
              </h3>
              {notifs.length === 0 && <p className="mn-empty">Nothing new.</p>}
              {notifs.slice(0, 6).map((n) => (
                <button key={n.id} type="button" className={`mn-row ${n.read === false ? "unread" : ""}`} onClick={() => markRead(n)}>
                  <span className="mn-main"><span style={{ whiteSpace: "normal" }}>{n.text}</span></span>
                  <span className="mn-time">{ago(n.createdAt)}</span>
                  {n.read === false && <span className="mn-dot" aria-label="Unread" />}
                </button>
              ))}
            </div>

            <button type="button" className="mn-link" onClick={() => { setOpen(false); window.dispatchEvent(new Event("openGuide")); }}>
              📘 Take the guided tour
            </button>

            {perm === "default" && (
              <button type="button" className="mn-desktop" onClick={askDesktop}>
                🔔 Turn on desktop alerts (works while VetAdopt is open in a tab)
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}

const CSS = `
.mn-fab { position: fixed; left: 18px; bottom: 18px; z-index: 950; width: 54px; height: 54px; border: none; border-radius: 50%; background: #0f172a; color: #fff; font-size: 24px; display: grid; place-items: center; padding: 0; line-height: 1; cursor: pointer; box-shadow: 0 8px 22px rgba(15,23,42,.4); }
.mn-fab:focus-visible, .mn-row:focus-visible, .mn-x:focus-visible, .mn-link:focus-visible, .mn-toast:focus-visible { outline: 3px solid #19a3a1; outline-offset: 2px; }
.mn-badge { position: absolute; top: -4px; right: -4px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: #dc2626; color: #fff; font-size: 12px; font-weight: 700; line-height: 1; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #fff; }
.mn-panel { position: fixed; left: 18px; bottom: 84px; z-index: 950; display: flex; flex-direction: column; width: min(380px, calc(100vw - 24px)); max-height: min(600px, calc(100dvh - 110px)); background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 16px 48px rgba(15,23,42,.28); overflow: hidden; color: #0f172a; font-family: inherit; }
.mn-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
.mn-x { background: none; border: none; font-size: 16px; cursor: pointer; color: #64748b; }
.mn-scroll { overflow-y: auto; padding: 4px 8px 12px; }
.mn-sec { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.mn-sec h3 { display: flex; align-items: center; gap: 8px; margin: 6px 8px; font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
.mn-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 8px; border: none; border-radius: 12px; background: transparent; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.mn-row:hover { background: #f8fafc; }
.mn-row.unread { background: #ecf9f8; }
.mn-ico { font-size: 1.3rem; width: 38px; text-align: center; }
.mn-av { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.mn-av-f { display: inline-flex; align-items: center; justify-content: center; background: #0d6b6e; color: #fff; font-weight: 700; font-size: .8rem; }
.mn-main { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: .88rem; }
.mn-main span { color: #64748b; font-size: .8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mn-time { font-size: .7rem; color: #94a3b8; flex-shrink: 0; }
.mn-pill { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #0d6b6e; color: #fff; font-size: .72rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.mn-dot { width: 9px; height: 9px; border-radius: 50%; background: #0d6b6e; flex-shrink: 0; }
.mn-empty { margin: 6px 10px; color: #94a3b8; font-size: .85rem; }
.mn-link { background: none; border: none; color: #0d6b6e; font: inherit; font-weight: 700; cursor: pointer; padding: 6px 10px; text-decoration: underline; }
.mn-link.small { font-size: .72rem; margin-left: auto; padding: 0; text-transform: none; letter-spacing: 0; }
.mn-desktop { margin: 10px 8px 0; padding: 9px 12px; width: calc(100% - 16px); border: 1px dashed #b8e6e3; border-radius: 12px; background: #ecf9f8; color: #0b5457; font: inherit; font-size: .82rem; cursor: pointer; text-align: left; }
.mn-toast { position: fixed; left: 50%; top: 16px; right: auto; bottom: auto; transform: translateX(-50%); z-index: 960; display: flex; flex-direction: column; align-items: center; gap: 2px; width: max-content; max-width: min(420px, calc(100vw - 32px)); padding: 12px 22px; border: none; border-top: 4px solid #0d6b6e; border-radius: 16px; background: #fff; box-shadow: 0 12px 36px rgba(15,23,42,.3); text-align: center; cursor: pointer; font: inherit; color: #0f172a; animation: mn-in-c .25s ease; }
.mn-toast span { color: #475569; font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mn-panel.mn-top { left: auto; right: 16px; bottom: auto; top: 72px; max-height: calc(100dvh - 100px); }
.mn-toast.mn-top { left: 50%; right: auto; bottom: auto; top: 16px; }
@keyframes mn-in-c { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes mn-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .mn-toast { animation: none; } }
`;