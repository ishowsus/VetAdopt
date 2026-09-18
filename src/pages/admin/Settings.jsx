import { useState, useEffect } from "react";
import { auth, db } from "../../Firebase";
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { updateDoc, doc, getDoc } from "firebase/firestore";

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "#c62828" : "#2e7d32",
      color: "white", padding: "13px 20px", borderRadius: "12px",
      fontSize: "0.87rem", fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", maxWidth: 340,
    }}>
      {msg}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2e7d32", marginBottom: 7 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: "0.75rem", color: "#c62828", marginTop: 5, fontWeight: 600 }}>⚠️ {error}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [userData, setUserData] = useState({ name: "", email: "" });
  const [pwFields, setPwFields] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  // Load from Firebase Auth + Firestore (not just localStorage)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() : {};
        setUserData({ name: data.name || user.displayName || "", email: user.email });
      } catch (err) {
        console.error(err);
        // Fallback to auth data
        setUserData({ name: user.displayName || "", email: user.email });
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ── Save profile ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    const e = {};
    if (!userData.name.trim()) e.name = "Name is required.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in.");

      // Only update what's in Firestore (don't update email without re-auth)
      await updateDoc(doc(db, "users", user.uid), { name: userData.name });

      // Keep localStorage in sync for other components that read it
      const local = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...local, name: userData.name }));
      window.dispatchEvent(new Event("authChange"));

      showToast("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password (requires re-auth) ───────────────────────────────────────
  const handleChangePassword = async () => {
    const e = {};
    if (!pwFields.current) e.current = "Current password is required.";
    if (pwFields.next.length < 6) e.next = "Must be at least 6 characters.";
    if (pwFields.next !== pwFields.confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSavingPw(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in.");

      // Re-authenticate first — required by Firebase for sensitive operations
      const credential = EmailAuthProvider.credential(user.email, pwFields.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, pwFields.next);

      setPwFields({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully! 🔒");
    } catch (err) {
      console.error(err);
      const msg = err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
        ? "Current password is incorrect."
        : err.message;
      showToast(msg, "error");
    } finally {
      setSavingPw(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "13px 16px", border: `2px solid ${errors[field] ? "#e53935" : "#e0ece0"}`,
    borderRadius: "12px", fontSize: "0.92rem", fontFamily: "'DM Sans',sans-serif",
    color: "#1a2e1a", outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box",
  });

  if (loading) return <div style={{ padding: 40, color: "#9aaa9a", fontFamily: "'DM Sans',sans-serif" }}>Loading…</div>;

  return (
    <div className="st-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .st-root { padding:32px 36px; font-family:'DM Sans',sans-serif; color:#1a1a1a; max-width:600px; }
        .st-title { font-size:1.6rem; font-weight:800; color:#1a2e1a; margin-bottom:4px; }
        .st-sub { font-size:0.88rem; color:#9aaa9a; margin-bottom:32px; }
        .st-card { background:white; border-radius:20px; border:1px solid #eef4ee; padding:28px 32px; margin-bottom:24px; box-shadow:0 4px 14px rgba(0,0,0,0.04); }
        .st-card-title { font-size:1rem; font-weight:800; color:#1a2e1a; margin-bottom:4px; }
        .st-card-sub { font-size:0.8rem; color:#9aaa9a; margin-bottom:24px; }
        .st-divider { border:none; border-top:1px solid #eef4ee; margin:20px 0; }
        .st-btn {
          padding:13px 24px; border-radius:12px; border:none; cursor:pointer;
          font-size:0.9rem; font-weight:800; font-family:'DM Sans',sans-serif;
          transition:all 0.22s; background:linear-gradient(135deg,#2e7d32,#1b5e20);
          color:white; box-shadow:0 4px 14px rgba(46,125,50,0.25);
        }
        .st-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 20px rgba(46,125,50,0.35); }
        .st-btn:disabled { background:#c8d8c8; box-shadow:none; cursor:not-allowed; }
        .st-readonly { background:#f8fcf8; color:#9aaa9a; cursor:not-allowed; }
        .st-readonly-note { font-size:0.72rem; color:#9aaa9a; margin-top:5px; font-weight:600; }
        @media(max-width:600px) { .st-root { padding:20px; } .st-card { padding:22px; } }
      `}</style>

      <div className="st-title">Admin Settings</div>
      <div className="st-sub">Manage your profile and account credentials.</div>

      {/* ── Profile Card ── */}
      <div className="st-card">
        <div className="st-card-title">Profile Information</div>
        <div className="st-card-sub">Update your display name shown across the admin panel.</div>

        <Field label="Full Name" error={errors.name}>
          <input
            type="text"
            value={userData.name}
            onChange={(e) => { setUserData({ ...userData, name: e.target.value }); setErrors({ ...errors, name: "" }); }}
            style={inputStyle("name")}
            placeholder="Your full name"
          />
        </Field>

        <Field label="Email Address">
          <input
            type="email"
            value={userData.email}
            readOnly
            style={{ ...inputStyle(), background: "#f8fcf8", color: "#9aaa9a", cursor: "not-allowed" }}
          />
          <p className="st-readonly-note">Email cannot be changed here for security reasons. Contact support if needed.</p>
        </Field>

        <button className="st-btn" onClick={handleSaveProfile} disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>

      {/* ── Password Card ── */}
      <div className="st-card">
        <div className="st-card-title">Change Password</div>
        <div className="st-card-sub">We'll verify your current password before making changes.</div>

        <Field label="Current Password" error={errors.current}>
          <input
            type="password"
            value={pwFields.current}
            onChange={(e) => { setPwFields({ ...pwFields, current: e.target.value }); setErrors({ ...errors, current: "" }); }}
            style={inputStyle("current")}
            placeholder="Enter current password"
          />
        </Field>

        <Field label="New Password" error={errors.next}>
          <input
            type="password"
            value={pwFields.next}
            onChange={(e) => { setPwFields({ ...pwFields, next: e.target.value }); setErrors({ ...errors, next: "" }); }}
            style={inputStyle("next")}
            placeholder="Minimum 6 characters"
          />
        </Field>

        <Field label="Confirm New Password" error={errors.confirm}>
          <input
            type="password"
            value={pwFields.confirm}
            onChange={(e) => { setPwFields({ ...pwFields, confirm: e.target.value }); setErrors({ ...errors, confirm: "" }); }}
            style={inputStyle("confirm")}
            placeholder="Repeat new password"
          />
        </Field>

        <button className="st-btn" onClick={handleChangePassword} disabled={savingPw}>
          {savingPw ? "Updating…" : "Update Password"}
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}