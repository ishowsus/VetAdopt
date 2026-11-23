// FILE: src/components/VetOnboarding.jsx
import { signOut } from "firebase/auth";
import { ShieldCheck } from "lucide-react";
import { auth } from "../firebase";
import VerificationPanel from "./shared/VerificationPanel";
import { saveVerificationFile } from "../utils/verificationFile";

/** Shown instead of the vet dashboard until a license has been submitted. */
export default function VetOnboarding({ status, reviewNote }) {
  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange"));
      window.location.assign("/login");
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.shield} aria-hidden="true"><ShieldCheck size={34} /></div>
        <span style={s.eyebrow}>Vet verification</span>
        <h1 style={s.h1}>Welcome to VetAdopt, doctor 🩺</h1>
        <p style={s.lead}>
          Before you can open your dashboard, we need to confirm you're a licensed veterinarian. It keeps adopters safe and
          earns you a verified badge on the vet map.
        </p>

        {status === "rejected" && (
          <div role="alert" style={s.warn}>
            <strong>Your last submission wasn't approved.</strong>
            <div>{reviewNote ? `Reason: ${reviewNote}` : "Please check your documents and submit them again."}</div>
          </div>
        )}

        <ol style={s.steps}>
          <li><strong>Verify your email.</strong> We'll send a link to your inbox.</li>
          <li><strong>Add your license.</strong> Enter your PRC license number and attach photos of your license. A clinic permit or other proof is welcome too (up to 3 photos).</li>
          <li><strong>We review it.</strong> You can open your dashboard as soon as you submit. Once an admin approves, you get your verified badge.</li>
        </ol>

        <VerificationPanel
          role="vet"
          documentLabel="Veterinary license and documents"
          numberLabel="PRC license number"
          maxFiles={3}
          uploadFile={saveVerificationFile}
        />

        <p style={s.foot}>
          Only you and our review team can see your documents.{" "}
          <button type="button" onClick={logout} style={s.link}>Log out</button>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", background: "linear-gradient(160deg,#0a3d40,#0d6b6e)" },
  card: { width: "100%", maxWidth: 640, padding: "32px 28px", background: "#fff", borderRadius: 22, boxShadow: "0 30px 70px rgba(0,0,0,.3)", color: "#0f172a" },
  shield: { width: 64, height: 64, borderRadius: 20, background: "#d6f2f0", color: "#0b5457", display: "grid", placeItems: "center", marginBottom: 12 },
  eyebrow: { display: "inline-block", padding: "3px 12px", borderRadius: 999, background: "#d6f2f0", color: "#0b5457", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" },
  h1: { margin: "12px 0 8px", fontSize: "1.7rem", lineHeight: 1.2 },
  lead: { margin: "0 0 16px", color: "#475569", lineHeight: 1.55 },
  warn: { margin: "0 0 16px", padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 14 },
  steps: { margin: "0 0 20px", paddingLeft: 20, color: "#334155", lineHeight: 1.6, fontSize: 14 },
  foot: { margin: "20px 0 0", fontSize: 13, color: "#64748b" },
  link: { background: "none", border: "none", color: "#0d6b6e", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0, font: "inherit" },
};