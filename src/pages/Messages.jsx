// FILE: src/pages/Messages.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { conversationIdFor, sendMessage, markRead, MAX_MESSAGE_LENGTH, IMAGE_TYPES, MAX_IMAGE_BYTES } from "../utils/chat";

/* ───────────── small helpers ───────────── */

const initialsOf = (name) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const roleLabel = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "shelter") return "Shelter";
  if (r === "vet" || r === "veterinarian") return "Veterinarian";
  return "Adopter";
};

const formatTime = (ts) => {
  const d = ts?.toDate?.();
  if (!d) return "";
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const clockTime = (ts) => ts?.toDate?.().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) || "";
const dayKey = (ts) => ts?.toDate?.().toDateString() || "";
const dayLabel = (ts) => {
  const d = ts?.toDate?.();
  if (!d) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const ICONS = {
  send: "M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z",
  clip: "M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5",
  back: "M15 5l-7 7 7 7",
  down: "M12 5v14M5 12l7 7 7-7",
  more: "M12 5v.01M12 12v.01M12 19v.01",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.3-4.3",
  close: "M6 6l12 12M18 6 6 18",
};
function Icon({ name, size = 20, fill = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Avatar({ profile, size = 44 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [profile?.photo]);
  if (profile?.photo && !broken) {
    return <img className="ms-avatar" src={profile.photo} alt="" width={size} height={size} onError={() => setBroken(true)} />;
  }
  return (
    <span className="ms-avatar ms-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initialsOf(profile?.name)}
    </span>
  );
}

/* ───────────── page ───────────── */

export default function Messages() {
  const [params] = useSearchParams();
  const withParam = params.get("with");
  const petParam = params.get("pet");
  const petNameParam = params.get("petName");

  const [me, setMe] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [listError, setListError] = useState("");
  const [profiles, setProfiles] = useState({});
  const requested = useRef(new Set());

  const [activeOther, setActiveOther] = useState(withParam || null);
  const [pendingPet, setPendingPet] = useState(petParam ? { id: petParam, name: petNameParam || "" } : null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState("");

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [petInfo, setPetInfo] = useState(null);

  // scrolling
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);
  const lastIdRef = useRef(null);
  const [showJump, setShowJump] = useState(false);
  const [newBelow, setNewBelow] = useState(0);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setMe(u);
        setAuthReady(true);
      }),
    []
  );

  // Arriving from a "Message" button (or clicking another one) selects that person.
  useEffect(() => {
    if (withParam) setActiveOther(withParam);
    setPendingPet(petParam ? { id: petParam, name: petNameParam || "" } : null);
  }, [withParam, petParam, petNameParam]);

  // Live inbox.
  useEffect(() => {
    if (!me) return undefined;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", me.uid));
    return onSnapshot(
      q,
      (snap) => {
        setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setListError("");
      },
      (err) => {
        console.error(err);
        setListError("Couldn't load your conversations.");
      }
    );
  }, [me]);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => (b.updatedAt?.seconds ?? Infinity) - (a.updatedAt?.seconds ?? Infinity)),
    [conversations]
  );
  const otherOf = (c) => c.participants.find((p) => p !== me?.uid);

  // Names and photos for everyone we show.
  useEffect(() => {
    if (!me) return;
    const ids = new Set(conversations.map(otherOf).filter(Boolean));
    if (activeOther) ids.add(activeOther);
    const missing = [...ids].filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    Promise.all(
      missing.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, "users", id));
          const d = snap.exists() ? snap.data() : {};
          const photo = d.role === "shelter" ? d.logoUrl || d.photoURL || d.photoUrl : d.photoURL || d.photoUrl || d.logoUrl;
          return [id, { name: d.shelterName || d.name || d.displayName || "User", photo: photo || "", role: d.role || "", verified: d.isVerified === true }];
        } catch {
          return [id, { name: "User", photo: "", role: "", verified: false }];
        }
      })
    ).then((pairs) => setProfiles((prev) => ({ ...prev, ...Object.fromEntries(pairs) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, activeOther, me]);

  const convId = me && activeOther ? conversationIdFor(me.uid, activeOther) : null;
  const activeConv = conversations.find((c) => c.id === convId) || null;
  const convExists = !!activeConv;

  // Live messages for the open conversation (newest 100).
  useEffect(() => {
    setMessages([]);
    if (!convId || !convExists) return undefined;
    const q = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()),
      (err) => console.error(err)
    );
  }, [convId, convExists]);

  /* ── scrolling behaviour ── */

  const scrollToBottom = (smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? "smooth" : "auto" });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    if (near) {
      setShowJump(false);
      setNewBelow(0);
    } else {
      setShowJump(true);
    }
  };

  // Switching conversation: start at the newest message.
  useEffect(() => {
    atBottomRef.current = true;
    lastIdRef.current = null;
    setShowJump(false);
    setNewBelow(0);
  }, [convId]);

  // New messages: follow along if you're at the bottom (or you sent it), otherwise show the jump button.
  useEffect(() => {
    if (messages.length === 0) {
      lastIdRef.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    const prevId = lastIdRef.current;
    lastIdRef.current = last.id;
    if (!prevId) {
      requestAnimationFrame(() => scrollToBottom(false));
    } else if (last.id !== prevId) {
      if (atBottomRef.current || last.senderId === me?.uid) {
        requestAnimationFrame(() => scrollToBottom(true));
      } else {
        setNewBelow((n) => n + 1);
        setShowJump(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const myUnread = activeConv?.unread?.[me?.uid] || 0;
  useEffect(() => {
    if (convId && myUnread > 0) markRead(convId, me.uid).catch(() => {});
  }, [convId, myUnread, me]);

  // Esc closes the photo viewer / menu.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setLightbox("");
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── derived state ── */

  const iBlocked = !!activeConv?.blockedBy?.includes(me?.uid);
  const theyBlocked = !!activeConv?.blockedBy?.some((u) => u !== me?.uid);
  const activeProfile = profiles[activeOther];

  const petId = (pendingPet || activeConv?.petContext)?.id || null;
  useEffect(() => {
    setPetInfo(null);
    if (!petId) return undefined;
    let cancelled = false;
    getDoc(doc(db, "pets", petId))
      .then((s) => {
        if (!cancelled && s.exists()) setPetInfo({ id: s.id, ...s.data() });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [petId]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Day dividers + grouping of consecutive messages from the same person.
  const timeline = useMemo(() => {
    const out = [];
    let prevDay = "";
    messages.forEach((m) => {
      const key = dayKey(m.createdAt) || prevDay;
      if (key && key !== prevDay) {
        out.push({ kind: "day", id: `day-${key}`, label: dayLabel(m.createdAt) });
        prevDay = key;
      }
      out.push({ kind: "msg", m });
    });
    const chatty = (x) => x?.kind === "msg" && x.m.type !== "application";
    out.forEach((it, i) => {
      if (!chatty(it)) return;
      it.first = !(chatty(out[i - 1]) && out[i - 1].m.senderId === it.m.senderId);
      it.last = !(chatty(out[i + 1]) && out[i + 1].m.senderId === it.m.senderId);
    });
    return out;
  }, [messages]);

  const lastMsg = messages[messages.length - 1];
  const showSeen =
    !!lastMsg && lastMsg.senderId === me?.uid && lastMsg.type !== "application" &&
    (activeConv?.unread?.[activeOther] || 0) === 0;

  /* ── actions ── */

  const selectConversation = (c) => {
    setActiveOther(otherOf(c));
    setPendingPet(null);
    setError("");
    setNotice("");
    setReportOpen(false);
    setMenuOpen(false);
  };

  const pickImage = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) {
      setError("Use a JPEG, PNG or WEBP image.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      setError("That image is too large (15 MB max).");
      return;
    }
    setError("");
    setImageFile(f);
  };

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSend = async () => {
    const clean = text.trim();
    if (!me || !activeOther || (!clean && !imageFile) || sending) return;
    setSending(true);
    setError("");
    try {
      await sendMessage({
        meId: me.uid,
        otherId: activeOther,
        text: clean,
        imageFile,
        senderName: me.displayName || "Someone",
        petContext: pendingPet && pendingPet.id !== activeConv?.petContext?.id ? pendingPet : null,
      });
      setText("");
      setImageFile(null);
      setPendingPet(null);
      requestAnimationFrame(() => autoGrow(textareaRef.current));
    } catch (err) {
      console.error(err);
      setError(
        err.code === "permission-denied"
          ? "You can't message this person. You can message vets, shelters, and the owner of a pet you're asking about."
          : err.message || "Message not sent. Try again."
      );
    }
    setSending(false);
  };

  const toggleBlock = async () => {
    setMenuOpen(false);
    if (!convId) return;
    try {
      await updateDoc(doc(db, "conversations", convId), { blockedBy: iBlocked ? arrayRemove(me.uid) : arrayUnion(me.uid) });
    } catch (err) {
      console.error(err);
      setError("Couldn't update the block setting.");
    }
  };

  const submitReport = async () => {
    if (!reportText.trim() || !convId) return;
    try {
      await addDoc(collection(db, "reports"), {
        type: "chat",
        conversationId: convId,
        reporterId: me.uid,
        reportedUserId: activeOther,
        reason: reportText.trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      setReportOpen(false);
      setReportText("");
      setNotice("Thanks. Our team will review this conversation.");
    } catch (err) {
      console.error(err);
      setError("Couldn't send your report. Try again.");
    }
  };

  /* ── render ── */

  if (!authReady) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!me) return <p style={{ padding: 40 }}>Please log in to see your messages.</p>;

  const q = search.trim().toLowerCase();
  const visible = sorted.filter((c) => {
    if (!q) return true;
    const p = profiles[otherOf(c)];
    return (p?.name || "").toLowerCase().includes(q) || (c.lastMessage || "").toLowerCase().includes(q);
  });
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread?.[me.uid] || 0), 0);
  const petPhoto = petInfo && (petInfo.photoUrl || petInfo.image || petInfo.photo || petInfo.imageUrl);

  return (
    <div className="ms-root">
      <style>{CSS}</style>

      {/* ───── conversation list ───── */}
      <aside className={`ms-list ${activeOther ? "ms-hide-mobile" : ""}`} aria-label="Conversations">
        <div className="ms-list-head">
          <h2 className="ms-title">
            Messages {totalUnread > 0 && <span className="ms-unread" aria-label={`${totalUnread} unread`}>{totalUnread}</span>}
          </h2>
          <div className="ms-search">
            <Icon name="search" size={16} />
            <input aria-label="Search conversations" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="ms-list-scroll">
          {listError && <p className="ms-error">{listError}</p>}
          {!listError && sorted.length === 0 && (
            <div className="ms-empty-state">
              <span aria-hidden="true">🐾</span>
              <p>No conversations yet.</p>
              <small>Tap “Message” on a shelter’s pet to say hello.</small>
            </div>
          )}
          {sorted.length > 0 && visible.length === 0 && <p className="ms-empty">No matches.</p>}
          {visible.map((c) => {
            const other = otherOf(c);
            const p = profiles[other];
            const unread = c.unread?.[me.uid] || 0;
            return (
              <button key={c.id} type="button" className={`ms-row ${other === activeOther ? "active" : ""}`} onClick={() => selectConversation(c)}>
                <Avatar profile={p} />
                <span className="ms-row-main">
                  <span className="ms-row-top">
                    <strong className="ms-row-name">{p?.name || "…"}</strong>
                    <span className="ms-row-time">{formatTime(c.updatedAt)}</span>
                  </span>
                  <span className={`ms-row-last ${unread ? "unread" : ""}`}>
                    {c.lastSenderId === me.uid ? "You: " : ""}
                    {c.lastMessage}
                  </span>
                </span>
                {unread > 0 && <span className="ms-unread">{unread}</span>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ───── thread ───── */}
      <section className={`ms-thread ${activeOther ? "" : "ms-hide-mobile"}`} aria-label="Conversation">
        {!activeOther ? (
          <div className="ms-placeholder">
            <span aria-hidden="true">💬</span>
            <p>Select a conversation</p>
            <small>Your messages with shelters and vets show up here.</small>
          </div>
        ) : (
          <>
            <header className="ms-head">
              <button type="button" className="ms-icon-btn ms-back" onClick={() => setActiveOther(null)} aria-label="Back to conversations">
                <Icon name="back" />
              </button>
              <Avatar profile={activeProfile} />
              <div className="ms-head-main">
                <strong className="ms-head-name">
                  {activeProfile?.name || "…"}
                  {activeProfile?.verified && <span className="ms-check" title="Verified" aria-label="Verified">✓</span>}
                </strong>
                <span className="ms-head-sub">
                  <span className="ms-role">{roleLabel(activeProfile?.role)}</span>
                </span>
              </div>
              {convExists && (
                <div className="ms-menu-wrap">
                  <button type="button" className="ms-icon-btn" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="More options" onClick={() => setMenuOpen((v) => !v)}>
                    <Icon name="more" />
                  </button>
                  {menuOpen && (
                    <div className="ms-menu" role="menu">
                      <button type="button" role="menuitem" onClick={toggleBlock}>{iBlocked ? "Unblock" : "Block"}</button>
                      <button type="button" role="menuitem" onClick={() => { setReportOpen(true); setMenuOpen(false); }}>Report</button>
                    </div>
                  )}
                </div>
              )}
            </header>

            {petInfo && (
              <Link className="ms-pet" to={`/adopt?q=${encodeURIComponent(petInfo.name || "")}`}>
                {petPhoto && <img src={petPhoto} alt="" width={44} height={44} />}
                <span className="ms-pet-main">
                  <strong>{petInfo.name}</strong>
                  <span>{[petInfo.breed || petInfo.type, petInfo.age].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="ms-pet-status">{petInfo.badge || petInfo.status || "Available"}</span>
              </Link>
            )}

            <p className="ms-safety">
              🔒 Stay safe: never send money or deposits before meeting the pet in person, and meet in a public place.
            </p>

            {reportOpen && (
              <div className="ms-report">
                <label htmlFor="ms-report-text">What's wrong with this conversation?</label>
                <textarea id="ms-report-text" rows={2} value={reportText} onChange={(e) => setReportText(e.target.value)} />
                <div className="ms-report-actions">
                  <button type="button" className="ms-ghost" onClick={() => setReportOpen(false)}>Cancel</button>
                  <button type="button" className="ms-send-text" onClick={submitReport} disabled={!reportText.trim()}>Send report</button>
                </div>
              </div>
            )}

            {/* scrolling message area */}
            <div className="ms-scroll-area">
              <div className="ms-messages" ref={scrollRef} onScroll={onScroll} role="log" aria-live="polite" tabIndex={0} aria-label="Messages">
                {!convExists && (
                  <div className="ms-empty-state">
                    <span aria-hidden="true">👋</span>
                    <p>Say hello</p>
                    <small>Your first message starts the conversation.</small>
                  </div>
                )}

                {timeline.map((it) => {
                  if (it.kind === "day") {
                    return (
                      <div key={it.id} className="ms-day"><span>{it.label}</span></div>
                    );
                  }
                  const msg = it.m;
                  if (msg.type === "application") {
                    return (
                      <div key={msg.id} className={`ms-system ms-system-${msg.status}`}>
                        <span>{msg.text}</span>
                        <time>{clockTime(msg.createdAt)}</time>
                      </div>
                    );
                  }
                  const mine = msg.senderId === me.uid;
                  const seen = showSeen && msg.id === lastMsg.id;
                  return (
                    <div key={msg.id} className={`ms-line ${mine ? "mine" : "theirs"} ${it.first ? "is-first" : ""}`}>
                      {!mine && (
                        <span className="ms-line-avatar">{it.last && <Avatar profile={activeProfile} size={28} />}</span>
                      )}
                      <div className="ms-stack">
                        <div className={`ms-msg ${mine ? "mine" : "theirs"} ${it.first ? "is-first" : ""} ${it.last ? "is-last" : ""}`}>
                          {msg.imageUrl && (
                            <button type="button" className="ms-img-btn" onClick={() => setLightbox(msg.imageUrl)} aria-label="View photo full size">
                              <img
                                className="ms-img"
                                src={msg.imageUrl}
                                alt={`Photo from ${mine ? "you" : activeProfile?.name || "them"}`}
                                loading="lazy"
                                onLoad={() => atBottomRef.current && scrollToBottom(false)}
                              />
                            </button>
                          )}
                          {msg.text && <p>{msg.text}</p>}
                        </div>
                        {it.last && (
                          <span className="ms-meta">
                            {clockTime(msg.createdAt)}
                            {seen && " · Seen"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showJump && (
                <button type="button" className="ms-jump" onClick={() => scrollToBottom(true)}>
                  <Icon name="down" size={16} />
                  {newBelow > 0 ? `${newBelow} new message${newBelow > 1 ? "s" : ""}` : "Latest"}
                </button>
              )}
            </div>

            {notice && <p className="ms-notice">{notice}</p>}
            {error && <p className="ms-error">{error}</p>}

            {iBlocked || theyBlocked ? (
              <p className="ms-blocked">
                {iBlocked ? "You blocked this person. Unblock to send messages." : "You can't reply to this conversation."}
              </p>
            ) : (
              <div className="ms-compose-wrap">
                {imagePreview && (
                  <div className="ms-attach-preview">
                    <img src={imagePreview} alt="Photo to send" />
                    <button type="button" onClick={() => setImageFile(null)} aria-label="Remove photo"><Icon name="close" size={12} /></button>
                  </div>
                )}
                <div className="ms-compose">
                  <input ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={pickImage} style={{ display: "none" }} />
                  <button type="button" className="ms-icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Attach a photo" title="Attach a photo">
                    <Icon name="clip" />
                  </button>
                  <textarea
                    ref={textareaRef}
                    aria-label="Write a message"
                    rows={1}
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder="Write a message…"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      autoGrow(e.target);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button type="button" className="ms-send" onClick={handleSend} disabled={sending || (!text.trim() && !imageFile)} aria-label="Send message">
                    {sending ? <span className="ms-spinner" aria-hidden="true" /> : <Icon name="send" size={18} fill />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {lightbox && (
        <div className="ms-lightbox" role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setLightbox("")}>
          <button type="button" className="ms-lightbox-close" onClick={() => setLightbox("")} aria-label="Close photo"><Icon name="close" /></button>
          <img src={lightbox} alt="Full size" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

/* ───────────── styles ───────────── */

const CSS = `
.ms-root {
  --green: #0d6b6e; --green-dark: #0b5457; --green-soft: #ecf9f8; --ink: #0f172a; --muted: #5b6b7f; --line: #e2e8f0;
  display: grid; grid-template-columns: 340px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr);
  height: 80vh; height: calc(100dvh - 120px); min-height: 520px; max-height: 920px;
  width: calc(100% - 32px); max-width: 1120px; margin: 20px auto;
  background: #fff; border: 1px solid var(--line); border-radius: 22px; overflow: hidden;
  box-shadow: 0 12px 40px rgba(15, 23, 42, .10); color: var(--ink);
}
.ms-root *, .ms-root *::before, .ms-root *::after { box-sizing: border-box; }
.ms-root button { font: inherit; }

/* list */
.ms-list { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line); background: #fff; }
.ms-list-head { padding: 20px 18px 12px; }
.ms-title { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-size: 1.35rem; font-weight: 800; letter-spacing: -.01em; }
.ms-search { display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 40px; border-radius: 999px; background: #f1f5f9; color: var(--muted); }
.ms-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font: inherit; font-size: .9rem; color: var(--ink); }
.ms-search:focus-within { box-shadow: 0 0 0 3px #b8e6e3; }
.ms-list-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 12px; overscroll-behavior: contain; }
.ms-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; margin-bottom: 2px; border: none; border-radius: 14px; background: transparent; text-align: left; cursor: pointer; transition: background .15s; }
.ms-row:hover { background: #f8fafc; }
.ms-row.active { background: var(--green-soft); box-shadow: inset 3px 0 0 var(--green); }
.ms-row:focus-visible, .ms-icon-btn:focus-visible, .ms-jump:focus-visible, .ms-send:focus-visible, .ms-img-btn:focus-visible, .ms-pet:focus-visible { outline: 3px solid #19a3a1; outline-offset: 2px; }
.ms-avatar { border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #e2e8f0; }
.ms-avatar-fallback { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0d6b6e, #0d6b6e); color: #fff; font-weight: 700; }
.ms-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ms-row-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.ms-row-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .95rem; }
.ms-row-time { font-size: .72rem; color: var(--muted); flex-shrink: 0; }
.ms-row-last { font-size: .84rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-row-last.unread { color: var(--ink); font-weight: 600; }
.ms-unread { min-width: 22px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--green); color: #fff; font-size: .75rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }

/* thread */
.ms-thread { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: #fff; }
.ms-placeholder, .ms-empty-state { margin: auto; text-align: center; color: var(--muted); padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ms-placeholder span, .ms-empty-state span { font-size: 2.6rem; }
.ms-placeholder p, .ms-empty-state p { margin: 4px 0 0; font-weight: 700; color: var(--ink); }
.ms-head { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); background: #fff; flex-shrink: 0; }
.ms-head-main { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 2px; }
.ms-head-name { display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ms-role { display: inline-block; padding: 1px 10px; border-radius: 999px; background: #ecfdf5; color: var(--green-dark); font-size: .72rem; font-weight: 700; }
.ms-check { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-left: 6px; border-radius: 50%; background: var(--green); color: #fff; font-size: .6rem; flex-shrink: 0; }
.ms-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; border-radius: 50%; background: transparent; color: var(--muted); cursor: pointer; flex-shrink: 0; transition: background .15s, color .15s; }
.ms-icon-btn:hover { background: #f1f5f9; color: var(--ink); }
.ms-back { display: none; margin-left: -6px; }
.ms-menu-wrap { position: relative; }
.ms-menu { position: absolute; right: 0; top: 46px; z-index: 20; min-width: 150px; padding: 6px; border: 1px solid var(--line); border-radius: 12px; background: #fff; box-shadow: 0 10px 30px rgba(15, 23, 42, .15); }
.ms-menu button { display: block; width: 100%; padding: 10px 12px; border: none; border-radius: 8px; background: transparent; text-align: left; cursor: pointer; }
.ms-menu button:hover { background: #f1f5f9; }

.ms-pet { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--line); background: var(--green-soft); text-decoration: none; color: inherit; flex-shrink: 0; }
.ms-pet img { border-radius: 10px; object-fit: cover; flex-shrink: 0; }
.ms-pet-main { display: flex; flex-direction: column; flex: 1; min-width: 0; font-size: .88rem; }
.ms-pet-main span { color: var(--muted); font-size: .78rem; }
.ms-pet-status { padding: 3px 10px; border-radius: 999px; background: #d6f2f0; color: var(--green-dark); font-size: .72rem; font-weight: 700; }

.ms-safety { margin: 0; padding: 8px 16px; background: #fffbeb; border-bottom: 1px solid #fde68a; color: #92400e; font-size: .78rem; flex-shrink: 0; }
.ms-report { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; background: #fffbeb; border-bottom: 1px solid #fde68a; font-size: .86rem; flex-shrink: 0; }
.ms-report textarea { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font: inherit; resize: vertical; }
.ms-report-actions { display: flex; gap: 8px; justify-content: flex-end; }
.ms-ghost { padding: 8px 14px; border: none; border-radius: 999px; background: transparent; color: var(--muted); cursor: pointer; }
.ms-send-text { padding: 8px 16px; border: none; border-radius: 999px; background: var(--green); color: #fff; font-weight: 700; cursor: pointer; }
.ms-send-text:disabled { opacity: .5; cursor: not-allowed; }

/* the part that scrolls */
.ms-scroll-area { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; background:
  radial-gradient(circle at 12% 8%, #d6f2f0 0, transparent 38%),
  radial-gradient(circle at 92% 92%, #e0f2fe 0, transparent 38%), #f8fafc; }
.ms-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 16px 8px; display: flex; flex-direction: column; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.ms-messages:focus-visible { outline: 3px solid #19a3a1; outline-offset: -3px; }
.ms-messages::-webkit-scrollbar { width: 8px; }
.ms-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }

.ms-day { align-self: center; margin: 14px 0 8px; }
.ms-day span { padding: 3px 12px; border-radius: 999px; background: rgba(255,255,255,.9); border: 1px solid var(--line); color: var(--muted); font-size: .72rem; font-weight: 600; }

.ms-line { display: flex; align-items: flex-end; gap: 8px; margin-top: 2px; }
.ms-line.is-first { margin-top: 12px; }
.ms-line.mine { justify-content: flex-end; }
.ms-line-avatar { width: 28px; flex-shrink: 0; }
.ms-stack { display: flex; flex-direction: column; max-width: min(72%, 520px); }
.ms-line.mine .ms-stack { align-items: flex-end; }
.ms-msg { padding: 9px 14px; border-radius: 20px; box-shadow: 0 1px 2px rgba(15, 23, 42, .06); }
.ms-msg p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.4; }
.ms-msg.mine { background: linear-gradient(135deg, #0d6b6e, #0b5457); color: #fff; border-bottom-right-radius: 6px; }
.ms-msg.theirs { background: #fff; border: 1px solid var(--line); border-bottom-left-radius: 6px; }
.ms-msg.mine:not(.is-first) { border-top-right-radius: 6px; }
.ms-msg.theirs:not(.is-first) { border-top-left-radius: 6px; }
.ms-meta { margin: 3px 6px 0; font-size: .68rem; color: var(--muted); }
.ms-img-btn { display: block; padding: 0; margin: 0 0 6px; border: none; background: none; cursor: zoom-in; border-radius: 14px; overflow: hidden; }
.ms-img { display: block; max-width: 100%; width: 260px; max-height: 300px; object-fit: cover; border-radius: 14px; }
.ms-msg:has(.ms-img-btn):not(:has(p)) { padding: 4px; }
.ms-msg:has(.ms-img-btn):not(:has(p)) .ms-img-btn { margin: 0; }

.ms-system { align-self: center; display: flex; flex-direction: column; align-items: center; gap: 2px; max-width: 88%; margin: 12px 0 4px; padding: 8px 16px; border-radius: 14px; background: #e0f2fe; color: #075985; font-size: .85rem; text-align: center; }
.ms-system time { font-size: .68rem; opacity: .75; }
.ms-system-approved { background: #d6f2f0; color: #0b5457; }
.ms-system-rejected { background: #fee2e2; color: #991b1b; }
.ms-system-info_requested { background: #fef3c7; color: #92400e; }

.ms-jump { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: 999px; background: var(--ink); color: #fff; font-size: .82rem; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(15, 23, 42, .3); }
.ms-jump:hover { background: #1e293b; }

/* composer */
.ms-compose-wrap { border-top: 1px solid var(--line); background: #fff; flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom, 0); }
.ms-compose { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px; }
.ms-compose textarea { flex: 1; min-width: 0; resize: none; padding: 10px 16px; border: 1px solid var(--line); border-radius: 22px; background: #f8fafc; font: inherit; line-height: 1.4; max-height: 120px; outline: none; }
.ms-compose textarea:focus { border-color: #19a3a1; background: #fff; box-shadow: 0 0 0 3px #b8e6e3; }
.ms-send { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border: none; border-radius: 50%; background: linear-gradient(135deg, #0d6b6e, #0b5457); color: #fff; cursor: pointer; flex-shrink: 0; transition: transform .1s; }
.ms-send:hover:not(:disabled) { transform: scale(1.06); }
.ms-send:disabled { opacity: .45; cursor: not-allowed; }
.ms-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: ms-spin .7s linear infinite; }
@keyframes ms-spin { to { transform: rotate(360deg); } }
.ms-attach-preview { position: relative; display: inline-block; margin: 10px 16px 0; }
.ms-attach-preview img { max-height: 96px; border-radius: 12px; display: block; }
.ms-attach-preview button { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: var(--ink); color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }

.ms-empty { margin: 16px 12px; color: var(--muted); font-size: .9rem; }
.ms-error { margin: 8px 16px; padding: 8px 12px; border-radius: 10px; background: #fee2e2; color: #b91c1c; font-size: .85rem; }
.ms-notice { margin: 8px 16px; padding: 8px 12px; border-radius: 10px; background: #d1fae5; color: #065f46; font-size: .85rem; }
.ms-blocked { margin: 0; padding: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: .9rem; text-align: center; background: #fff; }

/* photo viewer */
.ms-lightbox { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15, 23, 42, .88); }
.ms-lightbox img { max-width: 100%; max-height: 100%; border-radius: 12px; }
.ms-lightbox-close { position: absolute; top: 16px; right: 16px; width: 44px; height: 44px; border: none; border-radius: 50%; background: rgba(255,255,255,.15); color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.ms-lightbox-close:hover { background: rgba(255,255,255,.28); }

@media (prefers-reduced-motion: reduce) {
  .ms-send, .ms-row, .ms-icon-btn { transition: none; }
  .ms-spinner { animation-duration: 1.6s; }
}

@media (max-width: 760px) {
  .ms-root { grid-template-columns: minmax(0, 1fr); width: 100%; margin: 0; border-radius: 0; border-left: none; border-right: none; height: calc(100dvh - 70px); }
  .ms-hide-mobile { display: none; }
  .ms-back { display: inline-flex; }
  .ms-list { border-right: none; }
  .ms-stack { max-width: 82%; }
  .ms-img { width: 220px; }
}
`;