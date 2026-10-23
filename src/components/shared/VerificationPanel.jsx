import { useEffect, useState } from "react";
import { auth, db } from "../../firebase"; // adjust path to your firebase.js
import { sendEmailVerification } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export const STATUS_META = {
  unverified: { label: "Not verified", bg: "#f3f4f6", fg: "#6b7280" },
  pending: { label: "Under review", bg: "#fef3c7", fg: "#92400e" },
  verified: { label: "Verified", bg: "#d1fae5", fg: "#065f46" },
  rejected: { label: "Needs changes", bg: "#fee2e2", fg: "#b91c1c" },
};

export function VerificationBadge({ status = "unverified" }) {
  const m = STATUS_META[status] || STATUS_META.unverified;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 12px",
        borderRadius: 999,
        background: m.bg,
        color: m.fg,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {status === "verified" ? "✓ " : ""}
      {m.label}
    </span>
  );
}

// Live status of the admin-reviewed document in verifications/{uid}.
export function useVerification(uid) {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    if (!uid) {
      setState({ loading: false, data: null });
      return undefined;
    }
    return onSnapshot(
      doc(db, "verifications", uid),
      (snap) => setState({ loading: false, data: snap.exists() ? snap.data() : null }),
      () => setState({ loading: false, data: null })
    );
  }, [uid]);
  return state;
}

/**
 * Props
 *  role            "adopter" | "vet" | "shelter"
 *  uploadFile      async (file, uid) => string   – uploads and returns a storage path/URL
 *  requireDocument false for adopters (email only)
 *  documentLabel   e.g. "Veterinary license"
 *  numberLabel     e.g. "License number" (omit to hide the field)
 *  defaultNumber   pre-fill for the number field
 */
export default function VerificationPanel({
  role,
  uploadFile,
  requireDocument = true,
  documentLabel = "Supporting document",
  numberLabel = "",
  defaultNumber = "",
}) {
  const user = auth.currentUser;
  const { loading, data } = useVerification(user?.uid);

  const [emailVerified, setEmailVerified] = useState(!!user?.emailVerified);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailMsg, setEmailMsg] = useState(null);

  const [file, setFile] = useState(null);
  const [idNumber, setIdNumber] = useState(defaultNumber);
  const [submitting, setSubmitting] = useState(false);
  const [docMsg, setDocMsg] = useState(null);

  const docStatus = data?.status || "unverified";
  const fullyVerified = emailVerified && (!requireDocument || docStatus === "verified");

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    setIdNumber((prev) => prev || defaultNumber);
  }, [defaultNumber]);

  const refreshEmailStatus = async (silent = false) => {
    if (!user) return;
    if (!silent) setChecking(true);
    try {
      await user.reload();
      setEmailVerified(user.emailVerified);
      if (!silent) {
        setEmailMsg(
          user.emailVerified
            ? { type: "ok", text: "Your email is verified." }
            : { type: "info", text: "Not verified yet. Open the link in your inbox, then check again." }
        );
      }
    } catch (err) {
      console.error(err);
      if (!silent) setEmailMsg({ type: "error", text: "Couldn't check your status. Try again." });
    } finally {
      if (!silent) setChecking(false);
    }
  };

  // Re-check automatically when the user comes back from their inbox.
  useEffect(() => {
    if (emailVerified) return undefined;
    const onFocus = () => refreshEmailStatus(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailVerified]);

  const sendEmail = async () => {
    if (!user) return;
    setSending(true);
    setEmailMsg(null);
    try {
      await sendEmailVerification(user);
      setCooldown(60);
      setEmailMsg({ type: "ok", text: `Verification link sent to ${user.email}.` });
    } catch (err) {
      console.error(err);
      setEmailMsg({
        type: "error",
        text:
          err.code === "auth/too-many-requests"
            ? "Too many requests. Wait a few minutes and try again."
            : "Couldn't send the email. Try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setDocMsg({ type: "error", text: "Upload a PDF, PNG, JPEG, or WEBP file." });
      return;
    }
    if (f.size > MAX_BYTES) {
      setDocMsg({ type: "error", text: "File must be smaller than 5 MB." });
      return;
    }
    setDocMsg(null);
    setFile(f);
  };

  const submitDocument = async () => {
    if (!user) return;
    if (numberLabel && !idNumber.trim()) {
      setDocMsg({ type: "error", text: `${numberLabel} is required.` });
      return;
    }
    if (!file) {
      setDocMsg({ type: "error", text: "Choose a document to upload." });
      return;
    }
    setSubmitting(true);
    setDocMsg(null);
    try {
      const documentPath = await uploadFile(file, user.uid);
      await setDoc(doc(db, "verifications", user.uid), {
        userId: user.uid,
        role,
        status: "pending",
        documentPath,
        documentName: file.name,
        idNumber: idNumber.trim(),
        submittedAt: serverTimestamp(),
        reviewNote: "",
      });
      setFile(null);
      setDocMsg({ type: "ok", text: "Submitted. We'll review it and update your status here." });
    } catch (err) {
      console.error(err);
      setDocMsg({ type: "error", text: "Couldn't submit your document. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const submittedOn = data?.submittedAt?.toDate?.().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <div style={{ ...s.summary, ...(fullyVerified ? s.summaryOk : {}) }}>
        <strong>{fullyVerified ? "Your account is verified" : "Your account isn't fully verified yet"}</strong>
        <span style={{ fontSize: 13, color: "#546e7a" }}>
          {fullyVerified
            ? "A verified badge now shows on your profile."
            : requireDocument
            ? "Verify your email and get your document approved to earn the badge."
            : "Verify your email to confirm it's really you."}
        </span>
      </div>

      {/* Step: email */}
      <section style={s.card}>
        <div style={s.cardHead}>
          <h4 style={s.h4}>Email address</h4>
          <VerificationBadge status={emailVerified ? "verified" : "unverified"} />
        </div>
        <p style={s.sub}>{user?.email}</p>

        {!emailVerified && (
          <div style={s.row}>
            <button type="button" style={s.primary} onClick={sendEmail} disabled={sending || cooldown > 0}>
              {sending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Send verification email"}
            </button>
            <button type="button" style={s.secondary} onClick={() => refreshEmailStatus(false)} disabled={checking}>
              {checking ? "Checking…" : "I've verified, check again"}
            </button>
          </div>
        )}
        {emailMsg && <Msg {...emailMsg} />}
      </section>

      {/* Step: document */}
      {requireDocument && (
        <section style={s.card}>
          <div style={s.cardHead}>
            <h4 style={s.h4}>{documentLabel}</h4>
            {!loading && <VerificationBadge status={docStatus} />}
          </div>

          {docStatus === "verified" && (
            <p style={s.sub}>Approved. Contact support if your details have changed and need re-checking.</p>
          )}

          {docStatus === "pending" && (
            <p style={s.sub}>
              {data?.documentName} was submitted{submittedOn ? ` on ${submittedOn}` : ""}. Reviews are done by hand,
              so this can take a few days.
            </p>
          )}

          {docStatus === "rejected" && (
            <Msg
              type="error"
              text={data?.reviewNote ? `Reviewer note: ${data.reviewNote}` : "Your document wasn't accepted. Upload a clearer or valid copy."}
            />
          )}

          {(docStatus === "unverified" || docStatus === "rejected") && (
            <>
              {!emailVerified && <p style={s.sub}>Verify your email first, then you can submit your document.</p>}

              {numberLabel && (
                <div style={{ marginTop: 12 }}>
                  <label htmlFor="ver-number" style={s.label}>{numberLabel}</label>
                  <input
                    id="ver-number"
                    style={s.input}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    disabled={!emailVerified}
                  />
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <label htmlFor="ver-file" style={s.label}>Document (PDF or photo, max 5 MB)</label>
                <input
                  id="ver-file"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFile}
                  disabled={!emailVerified}
                />
                {file && <p style={{ ...s.sub, margin: "6px 0 0" }}>Selected: {file.name}</p>}
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  style={s.primary}
                  onClick={submitDocument}
                  disabled={!emailVerified || submitting}
                >
                  {submitting ? "Submitting…" : docStatus === "rejected" ? "Resubmit for review" : "Submit for review"}
                </button>
              </div>
            </>
          )}
          {docMsg && <Msg {...docMsg} />}
        </section>
      )}
    </div>
  );
}

function Msg({ type, text }) {
  const c = {
    ok: { bg: "#d1fae5", fg: "#065f46" },
    error: { bg: "#fee2e2", fg: "#b91c1c" },
    info: { bg: "#e3f2fd", fg: "#1565c0" },
  }[type] || { bg: "#e3f2fd", fg: "#1565c0" };
  return (
    <div role="status" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: 13, background: c.bg, color: c.fg }}>
      {text}
    </div>
  );
}

const s = {
  summary: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "14px 16px",
    borderRadius: 12,
    background: "#fff8e1",
    marginBottom: 16,
  },
  summaryOk: { background: "#e8f5e9" },
  card: {
    background: "#f8f9fa",
    borderLeft: "5px solid #2e7d32",
    borderRadius: 12,
    padding: "16px 18px",
    marginBottom: 14,
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  h4: { margin: 0, fontSize: 15 },
  sub: { margin: "6px 0 0", fontSize: 13, color: "#607d8b" },
  row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    border: "1px solid #cfd8dc",
    borderRadius: 8,
    boxSizing: "border-box",
  },
  primary: {
    padding: "10px 18px",
    background: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondary: {
    padding: "10px 18px",
    background: "#fff",
    color: "#2e7d32",
    border: "2px solid #2e7d32",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};