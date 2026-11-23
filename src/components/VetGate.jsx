import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useVerification } from "./shared/VerificationPanel";
import VetOnboarding from "./VetOnboarding";

// false: a vet can open the dashboard once they have SUBMITTED their license.
// true:  a vet must also be APPROVED by an admin first.
const REQUIRE_APPROVAL = false;

/** Wraps the vet dashboard: <VetGate><VetLayout /></VetGate> */
export default function VetGate({ children }) {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [ready, setReady] = useState(!!auth.currentUser);
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUid(u?.uid || null);
        setReady(true);
      }),
    []
  );
  const { loading, data } = useVerification(uid);

  if (!ready || (uid && loading)) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!uid) return children; // the route's own login check handles this case

  const status = data?.status || "unverified";
  const allowed = REQUIRE_APPROVAL ? status === "verified" : status === "pending" || status === "verified";
  if (!allowed) return <VetOnboarding status={status} reviewNote={data?.reviewNote} />;

  return (
    <>
      {children}
      {status === "pending" && (
        <div
          role="status"
          style={{ position: "fixed", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 940, padding: "8px 16px", borderRadius: 999, background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontSize: 13, fontWeight: 600, boxShadow: "0 6px 18px rgba(0,0,0,.18)" }}
        >
          ⏳ Your license is under review
        </div>
      )}
    </>
  );
}