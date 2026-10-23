import { useState } from "react";
import { auth } from "../../firebase"; // adjust path to your firebase.js
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export default function PasswordPanel() {
  const user = auth.currentUser;
  const hasPassword = !!user?.providerData?.some((p) => p.providerId === "password");

  const [fields, setFields] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!hasPassword) {
    return (
      <p style={{ fontSize: 14, color: "#607d8b" }}>
        You sign in with a linked account (for example Google), so there's no password to change here.
      </p>
    );
  }

  const setField = (key) => (e) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!fields.current) errs.current = "Current password is required.";
    if (fields.next.length < 6) errs.next = "Use at least 6 characters.";
    if (fields.next !== fields.confirm) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setMsg(null);
    try {
      const cred = EmailAuthProvider.credential(user.email, fields.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, fields.next);
      setFields({ current: "", next: "", confirm: "" });
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      const wrong = err.code === "auth/wrong-password" || err.code === "auth/invalid-credential";
      setMsg({ ok: false, text: wrong ? "Current password is incorrect." : "Couldn't change your password. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { key: "current", label: "Current password" },
    { key: "next", label: "New password" },
    { key: "confirm", label: "Confirm new password" },
  ];

  return (
    <form onSubmit={submit} style={{ maxWidth: 420 }}>
      {rows.map(({ key, label }) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label htmlFor={`pw-${key}`} style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {label}
          </label>
          <input
            id={`pw-${key}`}
            type="password"
            value={fields[key]}
            onChange={setField(key)}
            autoComplete={key === "current" ? "current-password" : "new-password"}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 15,
              border: `1px solid ${errors[key] ? "#c62828" : "#cfd8dc"}`,
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />
          {errors[key] && <p style={{ margin: "5px 0 0", fontSize: 12, color: "#c62828" }}>{errors[key]}</p>}
        </div>
      ))}

      {msg && (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 13,
            background: msg.ok ? "#d1fae5" : "#fee2e2",
            color: msg.ok ? "#065f46" : "#b91c1c",
          }}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "12px 22px",
          background: "#2e7d32",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {saving ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}