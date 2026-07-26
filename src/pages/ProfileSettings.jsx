import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../Firebase";
import { signOut, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── tiny toast helper ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { success: "#2e7d32", error: "#c62828", info: "#1565c0" };
  return (
    <div style={{
      position: "fixed", bottom: "28px", right: "28px", zIndex: 9999,
      background: colors[type] || colors.info, color: "white",
      padding: "14px 22px", borderRadius: "12px", fontSize: "0.88rem",
      fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      animation: "slideUp 0.3s ease", maxWidth: "340px", lineHeight: 1.4,
    }}>
      {message}
    </div>
  );
}

// ─── avatar helper ─────────────────────────────────────────────────────────────
function Avatar({ photoURL, name, size = 90 }) {
  const initials = name ? name.charAt(0).toUpperCase() : "P";
  return photoURL ? (
    <img
      src={photoURL}
      alt="Profile"
      style={{
        width: size, height: size, borderRadius: "50%", objectFit: "cover",
        border: "3px solid #e8f5e9", boxShadow: "0 8px 20px rgba(46,125,50,0.2)",
      }}
    />
  ) : (
    <div style={{
      width: size, height: size, background: "linear-gradient(135deg,#388e3c,#1b5e20)",
      color: "white", borderRadius: "50%", display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.38, fontWeight: 800,
      boxShadow: "0 8px 20px rgba(46,125,50,0.25)", letterSpacing: "-1px",
      fontFamily: "'Georgia', serif",
    }}>
      {initials}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────
export default function ProfileSettings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("general");
  const [user, setUser] = useState({ name: "", email: "", role: "Adopter", photoURL: "" });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState(null);

  // password fields
  const [pwFields, setPwFields] = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  // live notifications from Firestore
  const [notifications, setNotifications] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  const showToast = (message, type = "success") => setToast({ message, type });

  // ── auth listener & user data ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { navigate("/login"); return; }
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        const data = snap.exists() ? snap.data() : {};
        setUser({
          name: data.name || currentUser.displayName || "User",
          email: currentUser.email,
          role: data.role || "Adopter",
          photoURL: data.photoURL || currentUser.photoURL || "",
        });
      } catch (err) { console.error(err); }
      setLoading(false);
    });
    return unsub;
  }, [navigate]);

  // ── live notifications listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setNotifsLoading(false);
    }, () => setNotifsLoading(false));
    return unsub;
  }, [loading]); // re-run once auth is ready

  // ── save display name ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user.name.trim()) { showToast("Display name is required.", "error"); return; }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { name: user.name });
      const local = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...local, name: user.name }));
      window.dispatchEvent(new Event("authChange"));
      showToast("Profile updated! ✨");
    } catch (e) { showToast(e.message, "error"); }
    finally { setIsSaving(false); }
  };

  // ── photo upload ─────────────────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Photo must be under 5 MB.", "error"); return; }
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `profilePhotos/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: url });
      setUser((u) => ({ ...u, photoURL: url }));
      showToast("Photo updated!");
    } catch (e) { showToast(e.message, "error"); }
    finally { setUploadingPhoto(false); }
  };

  // ── change password ──────────────────────────────────────────────────────────
  const validatePw = () => {
    const errs = {};
    if (!pwFields.current) errs.current = "Current password is required.";
    if (pwFields.next.length < 6) errs.next = "Must be at least 6 characters.";
    if (pwFields.next !== pwFields.confirm) errs.confirm = "Passwords do not match.";
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePw()) return;
    setSavingPw(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, pwFields.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, pwFields.next);
      setPwFields({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully! 🔒");
    } catch (e) {
      const msg = e.code === "auth/wrong-password" ? "Current password is incorrect." : e.message;
      showToast(msg, "error");
    }
    finally { setSavingPw(false); }
  };

  // ── logout ───────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#f0f4f0", color: "#2e7d32",
        fontFamily: "Georgia, serif", fontSize: "1.1rem", gap: "10px",
      }}>
        <span style={{ animation: "spin 1.2s linear infinite", display: "inline-block" }}>🐾</span>
        Loading Profile…
      </div>
    );
  }

  const tabs = [
    { key: "general", icon: "👤", label: "Account" },
    { key: "password", icon: "🔒", label: "Password" },
    { key: "notifications", icon: "🔔", label: "Activity" },
  ];

  return (
    <div className="ps-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .ps-root {
          min-height: 100vh; background: #f2f6f2;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 48px 16px; font-family: 'DM Sans', sans-serif;
        }
        .ps-card {
          display: flex; width: 100%; max-width: 960px;
          background: #fff; border-radius: 28px; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04);
          min-height: 620px;
        }

        /* ── Sidebar ── */
        .ps-sidebar {
          width: 280px; flex-shrink: 0;
          background: linear-gradient(175deg, #f9fff9 0%, #eef5ee 100%);
          border-right: 1px solid #e3eee3;
          padding: 44px 20px 36px;
          display: flex; flex-direction: column; align-items: center;
        }
        .ps-avatar-wrap { position: relative; cursor: pointer; margin-bottom: 6px; }
        .ps-avatar-overlay {
          position: absolute; inset: 0; border-radius: 50%;
          background: rgba(0,0,0,0.45); display: flex; align-items: center;
          justify-content: center; opacity: 0; transition: opacity 0.2s;
          color: white; font-size: 0.72rem; font-weight: 700; text-align: center;
          line-height: 1.3; padding: 4px;
        }
        .ps-avatar-wrap:hover .ps-avatar-overlay { opacity: 1; }
        .ps-upload-hint { font-size: 0.7rem; color: #81a881; margin-top: 6px; }

        .ps-user-name {
          font-family: 'Lora', serif; font-size: 1.15rem; font-weight: 700;
          color: #1a2e1a; margin-top: 12px; text-align: center;
        }
        .ps-user-email { font-size: 0.76rem; color: #9aaa9a; margin-top: 3px; text-align: center; }
        .ps-role-badge {
          margin-top: 10px; padding: 4px 14px; border-radius: 99px;
          background: #e8f5e9; color: #2e7d32; font-size: 0.67rem;
          font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          border: 1px solid #c8e6c9;
        }

        .ps-nav { width: 100%; margin-top: 32px; }
        .ps-nav-btn {
          width: 100%; padding: 13px 16px; margin-bottom: 6px;
          border-radius: 14px; border: none; background: transparent;
          color: #557055; font-weight: 600; font-size: 0.88rem;
          text-align: left; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 10px;
          font-family: 'DM Sans', sans-serif;
        }
        .ps-nav-btn:hover:not(.active):not(.logout) { background: #e8f5e8; color: #2e7d32; }
        .ps-nav-btn.active { background: #2e7d32; color: white; box-shadow: 0 4px 12px rgba(46,125,50,0.25); }
        .ps-nav-btn.logout { color: #c62828; margin-top: 28px; }
        .ps-nav-btn.logout:hover { background: #ffebee; }

        /* ── Content ── */
        .ps-content { flex: 1; padding: 48px 52px; animation: fadeIn 0.3s ease; }
        .ps-section-title {
          font-family: 'Lora', serif; font-size: 1.6rem; font-weight: 700; color: #1a2e1a;
        }
        .ps-section-sub { color: #9aaa9a; font-size: 0.84rem; margin-top: 4px; }
        .ps-divider { border: none; border-top: 1px solid #edf2ed; margin: 28px 0; }

        /* ── Fields ── */
        .ps-field { margin-bottom: 22px; }
        .ps-label {
          display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
          color: #2e7d32; text-transform: uppercase; margin-bottom: 8px;
        }
        .ps-input {
          width: 100%; padding: 13px 16px; border-radius: 12px;
          border: 1.5px solid #e0e8e0; font-size: 0.95rem; transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'DM Sans', sans-serif; color: #1a2e1a; background: #fff;
        }
        .ps-input:focus { border-color: #2e7d32; outline: none; box-shadow: 0 0 0 3px rgba(46,125,50,0.1); }
        .ps-input.readonly { background: #f6faf6; color: #9aaa9a; cursor: not-allowed; }
        .ps-input.error { border-color: #c62828; }
        .ps-err { font-size: 0.75rem; color: #c62828; margin-top: 5px; }

        .ps-btn {
          padding: 14px 28px; border-radius: 12px; border: none; cursor: pointer;
          font-weight: 700; font-size: 0.9rem; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .ps-btn-primary { background: #2e7d32; color: white; }
        .ps-btn-primary:hover:not(:disabled) { background: #1b5e20; box-shadow: 0 4px 12px rgba(46,125,50,0.3); transform: translateY(-1px); }
        .ps-btn-primary:disabled { background: #c8d8c8; cursor: not-allowed; }

        /* ── Notification cards ── */
        .ps-notif {
          padding: 16px 18px; border-radius: 14px; border: 1px solid #e8f0e8;
          margin-bottom: 10px; display: flex; gap: 14px; align-items: flex-start;
          background: #fafcfa; transition: box-shadow 0.2s;
        }
        .ps-notif:hover { box-shadow: 0 4px 12px rgba(46,125,50,0.08); }
        .ps-notif-icon { font-size: 1.3rem; flex-shrink: 0; margin-top: 2px; }
        .ps-notif-text { font-size: 0.875rem; font-weight: 600; color: #1a2e1a; line-height: 1.45; }
        .ps-notif-date { font-size: 0.72rem; color: #9aaa9a; margin-top: 3px; }
        .ps-empty { color: #9aaa9a; font-size: 0.9rem; text-align: center; padding: 40px 0; }

        /* ── Responsive ── */
        @media (max-width: 720px) {
          .ps-root { padding: 0; align-items: stretch; }
          .ps-card { flex-direction: column; border-radius: 0; min-height: 100vh; box-shadow: none; }
          .ps-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #e3eee3; padding: 32px 20px 24px; }
          .ps-nav { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 18px; }
          .ps-nav-btn { width: auto; flex: 1; min-width: 100px; justify-content: center; margin-bottom: 0; }
          .ps-nav-btn.logout { margin-top: 0; }
          .ps-content { padding: 32px 22px; }
        }
      `}</style>

      <div className="ps-card">
        {/* ── Sidebar ──────────────────────────────────── */}
        <aside className="ps-sidebar">
          <div
            className="ps-avatar-wrap"
            onClick={() => fileInputRef.current?.click()}
            title="Change profile photo"
          >
            <Avatar photoURL={user.photoURL} name={user.name} />
            <div className="ps-avatar-overlay">
              {uploadingPhoto ? "Uploading…" : "Change\nPhoto"}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
          <p className="ps-upload-hint">Click photo to change</p>

          <p className="ps-user-name">{user.name}</p>
          <p className="ps-user-email">{user.email}</p>
          <span className="ps-role-badge">{user.role}</span>

          <nav className="ps-nav">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`ps-nav-btn ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
            <button className="ps-nav-btn logout" onClick={handleLogout}>
              🚪 Logout
            </button>
          </nav>
        </aside>

        {/* ── Content ──────────────────────────────────── */}
        <main className="ps-content" key={activeTab}>

          {/* General / Account */}
          {activeTab === "general" && (
            <div>
              <h2 className="ps-section-title">Account Settings</h2>
              <p className="ps-section-sub">Update your display name and view account details.</p>
              <hr className="ps-divider" />

              <div className="ps-field">
                <label className="ps-label">Display Name</label>
                <input
                  className="ps-input"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              <div className="ps-field">
                <label className="ps-label">Email Address</label>
                <input
                  className="ps-input readonly"
                  type="email"
                  value={user.email}
                  readOnly
                />
              </div>

              <div className="ps-field">
                <label className="ps-label">Role</label>
                <input
                  className="ps-input readonly"
                  type="text"
                  value={user.role}
                  readOnly
                />
              </div>

              <button className="ps-btn ps-btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}

          {/* Password */}
          {activeTab === "password" && (
            <div>
              <h2 className="ps-section-title">Change Password</h2>
              <p className="ps-section-sub">We'll verify your current password before making changes.</p>
              <hr className="ps-divider" />

              {[
                { key: "current", label: "Current Password", placeholder: "Enter current password" },
                { key: "next", label: "New Password", placeholder: "At least 6 characters" },
                { key: "confirm", label: "Confirm New Password", placeholder: "Repeat new password" },
              ].map(({ key, label, placeholder }) => (
                <div className="ps-field" key={key}>
                  <label className="ps-label">{label}</label>
                  <input
                    className={`ps-input${pwErrors[key] ? " error" : ""}`}
                    type="password"
                    placeholder={placeholder}
                    value={pwFields[key]}
                    onChange={(e) => {
                      setPwFields((f) => ({ ...f, [key]: e.target.value }));
                      setPwErrors((err) => ({ ...err, [key]: "" }));
                    }}
                  />
                  {pwErrors[key] && <p className="ps-err">{pwErrors[key]}</p>}
                </div>
              ))}

              <button className="ps-btn ps-btn-primary" onClick={handleChangePassword} disabled={savingPw}>
                {savingPw ? "Updating…" : "Update Password"}
              </button>
            </div>
          )}

          {/* Activity / Notifications */}
          {activeTab === "notifications" && (
            <div>
              <h2 className="ps-section-title">Activity History</h2>
              <p className="ps-section-sub">Live updates on your adoption applications and appointments.</p>
              <hr className="ps-divider" />

              {notifsLoading ? (
                <p className="ps-empty">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="ps-empty">🐾 No activity yet. Check back soon!</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="ps-notif">
                    <span className="ps-notif-icon">🐾</span>
                    <div>
                      <p className="ps-notif-text">{n.text}</p>
                      <p className="ps-notif-date">
                        {n.createdAt?.toDate
                          ? n.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : n.date ?? ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}