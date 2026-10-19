import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { FaPaw } from "react-icons/fa";

// Firebase imports
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { reserveUniqueAccessCode } from "../accessCode";
import { sendAccessCodeEmail } from "../sendAccessCodeEmail";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1200&q=80";

const EMPTY_DIGITS = ["", "", "", "", "", ""];
const MAX_CODE_ATTEMPTS = 5;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered ? location.state : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Two-step sign-in: "credentials" (email + password) then "code" (6-digit access code)
  const [step, setStep] = useState("credentials");
  const [pending, setPending] = useState(null); // account waiting for its code
  const [digits, setDigits] = useState(EMPTY_DIGITS);
  const [attempts, setAttempts] = useState(0);
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);
  const pendingRef = useRef(null);
  const doneRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Map Firebase auth error codes to friendlier messages
  const getAuthErrorMessage = (error) => {
    switch (error.code) {
      case "auth/invalid-email":
        return "That email address doesn't look right.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  // Resend-button countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // If someone leaves the page in the middle of step 2, don't leave a signed-in
  // Firebase session behind. (Finishing the login sets doneRef first.)
  useEffect(() => {
    return () => {
      if (pendingRef.current && !doneRef.current) signOut(auth).catch(() => {});
    };
  }, []);

  // Everything is verified: save the user for the app and go to their dashboard.
  const finishLogin = ({ user, userData, role, status }) => {
    doneRef.current = true;

    // Save logged in user (App.jsx reads this)
    localStorage.setItem(
      "user",
      JSON.stringify({
        uid: user.uid,
        name: userData.name || user.displayName || "",
        email: user.email,
        role,
        status,
      })
    );

    // Notify App.jsx
    window.dispatchEvent(new Event("authChange"));

    // Redirect based on role
    switch (role) {
      case "admin":
        navigate("/admin/dashboard");
        break;

      case "veterinarian":
      case "vet":
        navigate("/vet/dashboard");
        break;

      case "shelter":
        navigate("/shelter/dashboard");
        break;

      default:
        navigate("/adopt");
    }
  };

  // Step 2: check the 6-digit code
  const verifyCode = async (codeStr) => {
    if (!pending) return;

    if (!/^\d{6}$/.test(codeStr)) {
      setErrorMsg("Please enter all 6 digits.");
      return;
    }

    if (codeStr !== pending.storedCode) {
      const used = attempts + 1;
      setAttempts(used);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setDigits(EMPTY_DIGITS);
      inputRefs.current[0]?.focus();

      if (used >= MAX_CODE_ATTEMPTS) {
        try { await signOut(auth); } catch { /* ignore */ }
        pendingRef.current = null;
        setPending(null);
        setStep("credentials");
        setPassword("");
        setErrorMsg("Too many incorrect codes. Please sign in again.");
        return;
      }

      const left = MAX_CODE_ATTEMPTS - used;
      setErrorMsg(`Incorrect access code. ${left} attempt${left === 1 ? "" : "s"} left.`);
      return;
    }

    setErrorMsg("");
    finishLogin(pending);
  };

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "");
    const next = [...digits];

    if (!clean) {
      next[index] = "";
      setDigits(next);
      return;
    }

    // Normally one digit; also copes with autofill dropping several in at once
    let i = index;
    for (const ch of clean) {
      if (i > 5) break;
      next[i] = ch;
      i++;
    }
    setDigits(next);
    inputRefs.current[Math.min(i, 5)]?.focus();

    if (next.every(Boolean)) verifyCode(next.join(""));
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      verifyCode(digits.join(""));
    }
  };

  const handleDigitPaste = (e) => {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = [...EMPTY_DIGITS];
    text.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) verifyCode(text);
  };

  // Email the same code again (30s between sends)
  const resendCode = async () => {
    if (!pending || cooldown > 0) return;
    setCooldown(30);
    try {
      await sendAccessCodeEmail({
        email: pending.email,
        name: pending.userData.name,
        code: pending.storedCode,
      });
      setErrorMsg("");
      setNotice(`We emailed your access code again to ${pending.email}. Check your spam folder too.`);
    } catch (err) {
      console.error("Access code email failed:", err);
      setErrorMsg("We couldn't send the email right now. Please try again in a bit.");
    }
  };

  // Go back to step 1 (and drop the half-finished Firebase session)
  const backToLogin = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    pendingRef.current = null;
    setPending(null);
    setStep("credentials");
    setDigits(EMPTY_DIGITS);
    setAttempts(0);
    setPassword("");
    setErrorMsg("");
  };

  // Login Function (step 1: email + password)
  const handleLogin = async (e) => {
    e?.preventDefault();

    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, cleanEmail, password);

      // 1. Only verified (real) email addresses can sign in.
      //    Send a fresh link, then sign out so no half-logged-in session is left.
      if (!user.emailVerified) {
        let note = ` We just sent a new verification link to ${cleanEmail}.`;
        try {
          await sendEmailVerification(user);
        } catch (err) {
          note =
            err.code === "auth/too-many-requests"
              ? " A link was sent recently, so check your inbox and spam folder."
              : "";
        }
        await signOut(auth);
        setErrorMsg(`Please verify your email before signing in.${note}`);
        return;
      }

      // 2. Load the account details from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        setErrorMsg("We couldn't find your account details. Please contact support.");
        return;
      }

      const userData = userDoc.data();

      const role = String(userData.role || "adopter").trim().toLowerCase();
      // Status is "active", "suspended" or "banned". Older accounts may still
      // carry "approved"/"pending" or no status at all — those count as active.
      const rawStatus = String(userData.status || "active").trim().toLowerCase();
      const status = ["suspended", "banned"].includes(rawStatus) ? rawStatus : "active";

      // 3. Banned / suspended accounts can't sign in
      if (status === "banned") {
        await signOut(auth);
        setErrorMsg("This account has been banned. Please contact support if you think this is a mistake.");
        return;
      }
      if (status === "suspended") {
        await signOut(auth);
        setErrorMsg("This account is currently suspended. Please contact support.");
        return;
      }

      // 4. Admins sign in with email + password only. Everyone else continues to
      //    step 2, where they enter their 6-digit access code.
      if (role === "admin") {
        finishLogin({ user, userData, role, status });
        return;
      }

      let storedCode = String(userData.accessCode || "");
      let startNotice = "Enter the 6-digit access code that was emailed to you when you registered.";
      let startCooldown = 0;

      // Account made before codes existed: issue one now and email it.
      if (!storedCode) {
        storedCode = await reserveUniqueAccessCode(user.uid);
        await updateDoc(doc(db, "users", user.uid), { accessCode: storedCode });
        startNotice = `We've given your account a new 6-digit access code and emailed it to ${cleanEmail}.`;
        startCooldown = 30;
        try {
          await sendAccessCodeEmail({ email: cleanEmail, name: userData.name, code: storedCode });
        } catch (err) {
          console.error("Access code email failed:", err);
          startNotice = `We couldn't email your new access code, so here it is: ${storedCode}. Enter it below.`;
          startCooldown = 0;
        }
      } else {
        // Existing account: email the code right after the password step,
        // so it's waiting in their inbox when the code screen appears.
        startNotice = `We emailed your 6-digit access code to ${cleanEmail}. It can take a minute to arrive, so check spam too.`;
        startCooldown = 30;
        try {
          await sendAccessCodeEmail({ email: cleanEmail, name: userData.name, code: storedCode });
        } catch (err) {
          console.error("Access code email failed:", err);
          startNotice = "We couldn't email your code just now. Choose “Email my code again” below to try once more.";
          startCooldown = 0;
        }
      }

      // 5. Show the code screen. The person stays signed in with Firebase only
      //    until the code is confirmed; nothing is saved for the app before then.
      const waiting = { user, userData, role, status, storedCode, email: cleanEmail };
      pendingRef.current = waiting;
      setPending(waiting);
      setDigits(EMPTY_DIGITS);
      setAttempts(0);
      setNotice(startNotice);
      setCooldown(startCooldown);
      setStep("code");
      return;
    } catch (error) {
      console.error(error);

      if (error.code) {
        setErrorMsg(getAuthErrorMessage(error));
      } else {
        setErrorMsg(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Function
  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg("Please enter your email first.");
      return;
    }

    setErrorMsg("");

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error(error);
      setErrorMsg(getAuthErrorMessage(error));
    }
  };

  return (
    <div className="auth-split">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .auth-split {
          --ink: #10261c;
          --green: #1f6b3a;
          --green-dark: #17532d;
          --mist: #eef4f0;
          --line: #d3ded6;
          --muted: #58695e;
          --brass: #b9852a;
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
          color: var(--ink);
          background: var(--mist);
        }

        .auth-split-form-col { width: 100%; display: flex; flex-direction: column; }
        @media (min-width: 960px) { .auth-split-form-col { width: 46%; } }

        .auth-split-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 28px 32px 0;
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--green-dark);
        }
        .brand-mark {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: var(--green);
          color: #fff;
          font-size: 0.95rem;
        }

        .auth-split-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 32px 48px;
        }
        .auth-split-form { width: 100%; max-width: 400px; }

        .auth-split-form h1 {
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 2.35rem;
          line-height: 1.05;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
          color: var(--ink);
        }
        .auth-split-form .subtitle {
          color: var(--muted);
          margin: 0 0 26px;
          font-size: 1rem;
          line-height: 1.5;
          max-width: 36ch;
        }

        /* Step 1 of 2 / Step 2 of 2 */
        .steps {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 20px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--muted);
        }
        .step-bar { display: flex; gap: 6px; }
        .step-seg { width: 28px; height: 4px; border-radius: 2px; background: var(--line); }
        .step-seg.on { background: var(--green); }

        .error-banner {
          background: #fdecea;
          color: #9f1f17;
          border: 1px solid #f3c2bd;
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 18px;
        }
        .info-banner {
          background: #e1efe5;
          color: var(--green-dark);
          border: 1px solid #c3dcc9;
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 0.9rem;
          line-height: 1.45;
          margin-bottom: 18px;
        }
        .code-box {
          margin-top: 12px;
          padding: 12px;
          background: #fff;
          border: 2px dashed var(--green);
          border-radius: 14px;
          text-align: center;
        }
        .code-label { font-size: 0.8rem; font-weight: 600; }
        .code-value {
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          margin: 4px 0;
        }
        .code-note { font-size: 0.82rem; }

        .input-group { margin-bottom: 16px; }
        .input-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 0.88rem;
          color: var(--ink);
        }
        .auth-split input,
        .auth-split select {
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: 1.5px solid var(--line);
          background: #fff;
          box-sizing: border-box;
          font: inherit;
          font-size: 0.97rem;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-split input:focus,
        .auth-split select:focus {
          border-color: var(--green);
          box-shadow: 0 0 0 4px rgba(31, 107, 58, 0.14);
        }
        .auth-split input::placeholder { color: #8a9a90; }

        .role-hint { font-size: 0.8rem; color: var(--muted); margin-top: 6px; line-height: 1.4; }
        .strength-container { margin-top: 8px; }
        .strength-bar-bg { height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
        .strength-bar-fill { height: 100%; transition: all 0.4s ease; }
        .strength-text { font-size: 0.75rem; font-weight: 700; margin-top: 4px; text-align: right; }
        .mismatch-text { font-size: 0.78rem; font-weight: 600; margin-top: 4px; color: #b3261e; }

        .password-wrapper { position: relative; }
        .password-wrapper input { padding-right: 48px; }
        .password-toggle {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          border-radius: 8px;
          color: var(--green);
          padding: 0;
        }
        .password-toggle:hover { background: rgba(31, 107, 58, 0.08); }

        .forgot-password { text-align: right; margin-top: -6px; margin-bottom: 20px; }
        .forgot-password button {
          background: none;
          border: none;
          padding: 0;
          color: var(--green);
          cursor: pointer;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .forgot-password button:hover { text-decoration: underline; }

        .login-btn,
        .reg-btn {
          width: 100%;
          padding: 14px;
          background: var(--green);
          color: #fff;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font: inherit;
          font-size: 0.98rem;
          font-weight: 700;
          transition: background 0.15s, transform 0.1s;
        }
        .reg-btn { margin-top: 6px; }
        .login-btn:hover:not(:disabled),
        .reg-btn:hover:not(:disabled) { background: var(--green-dark); }
        .login-btn:active:not(:disabled),
        .reg-btn:active:not(:disabled) { transform: translateY(1px); }
        .login-btn:disabled,
        .reg-btn:disabled { background: #a9c4b0; cursor: not-allowed; }
        .login-btn:focus-visible,
        .reg-btn:focus-visible { outline: 3px solid var(--brass); outline-offset: 2px; }

        .footer-text, .footer-link { margin-top: 24px; font-size: 0.93rem; color: var(--muted); }
        .footer-text a, .footer-link a { color: var(--green-dark); font-weight: 700; text-decoration: none; }
        .footer-text a:hover, .footer-link a:hover { text-decoration: underline; }

        /* The access code, shown as a pet ID tag */
        .tag {
          position: relative;
          background: #fff;
          border: 2px solid var(--ink);
          border-radius: 30px;
          padding: 46px 22px 18px;
          margin: 4px 0 22px;
        }
        .tag-hole {
          position: absolute;
          top: 16px;
          left: 50%;
          width: 16px;
          height: 16px;
          margin-left: -8px;
          border-radius: 50%;
          background: var(--mist);
          border: 2px solid var(--ink);
        }
        .tag-title {
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: var(--muted);
          text-align: center;
          margin-bottom: 8px;
        }
        .otp-row { display: flex; gap: 10px; justify-content: space-between; }
        .auth-split .otp-box {
          width: 100%;
          min-width: 0;
          padding: 8px 0 6px;
          text-align: center;
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: var(--green-dark);
          background: transparent;
          border: none;
          border-bottom: 3px solid var(--line);
          border-radius: 0;
          box-shadow: none;
        }
        .auth-split .otp-box:focus { border-bottom-color: var(--brass); box-shadow: none; }
        .auth-split .otp-box.filled { border-bottom-color: var(--green); }
        .tag-foot {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px dashed var(--line);
          font-size: 0.85rem;
          color: var(--muted);
          text-align: center;
        }
        .tag.shake { animation: tag-shake 0.45s; }
        @keyframes tag-shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-6px); }
          40%, 60% { transform: translateX(6px); }
        }
        @media (prefers-reduced-motion: reduce) { .tag.shake { animation: none; } }

        .code-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
        }
        .code-actions button {
          background: none;
          border: none;
          padding: 0;
          color: var(--green-dark);
          cursor: pointer;
          font: inherit;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .code-actions button:hover:not(:disabled) { text-decoration: underline; }
        .code-actions button:disabled { color: #8a9a90; cursor: not-allowed; }

        .auth-split-image-col { display: none; position: relative; overflow: hidden; }
        @media (min-width: 960px) {
          .auth-split-image-col { display: block; width: 54%; padding: 16px 16px 16px 0; }
        }
        .auth-split-image-frame {
          position: relative;
          height: 100%;
          width: 100%;
          border-radius: 28px;
          overflow: hidden;
        }
        .auth-split-image-frame img { height: 100%; width: 100%; object-fit: cover; display: block; }
        .auth-split-image-frame::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(16, 38, 28, 0.55), rgba(16, 38, 28, 0) 45%);
          pointer-events: none;
        }
        .auth-split-image-caption {
          position: absolute;
          z-index: 1;
          left: 24px;
          right: 24px;
          bottom: 24px;
          color: #fff;
          font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.3;
          max-width: 28ch;
        }

        @media (max-width: 480px) {
          .auth-split-center { padding: 20px 20px 40px; }
          .auth-split-brand { padding: 22px 20px 0; }
          .auth-split-form h1 { font-size: 2rem; }
          .otp-row { gap: 6px; }
          .auth-split .otp-box { font-size: 1.7rem; }
        }
      `}</style>

      <div className="auth-split-form-col">
        <div className="auth-split-brand">
          <span className="brand-mark" aria-hidden="true"><FaPaw /></span>
          VetAdopt
        </div>

        <div className="auth-split-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="auth-split-form"
          >
            <motion.div variants={itemVariants}>
              <div className="steps">
                <span className="step-bar" aria-hidden="true">
                  <span className="step-seg on" />
                  <span className={`step-seg${step === "code" ? " on" : ""}`} />
                </span>
                <span>{step === "credentials" ? "Step 1 of 2" : "Step 2 of 2"}</span>
              </div>
              {step === "credentials" ? (
                <>
                  <h1>Welcome back</h1>
                  <p className="subtitle">Ready to find your new best friend?</p>
                </>
              ) : (
                <>
                  <h1>Enter your code</h1>
                  <p className="subtitle">One more step to sign in. Enter the code we just emailed you.</p>
                </>
              )}
            </motion.div>

            {step === "credentials" && justRegistered && !errorMsg && (
              <motion.div variants={itemVariants} className="info-banner">
                {justRegistered.emailSent === false
                  ? "Account created, but we couldn't send the verification email. Sign in below and we'll send a new link."
                  : `Account created! We sent a verification link to ${justRegistered.email}. Click it, then sign in.`}
                {justRegistered.codeEmailSent === false && justRegistered.accessCode ? (
                  <div className="code-box">
                    <div className="code-label">Your 6-digit access code</div>
                    <div className="code-value">{justRegistered.accessCode}</div>
                    <div className="code-note">
                      We couldn't email it, so save it now — you'll enter it after your password.
                    </div>
                  </div>
                ) : (
                  " We also emailed you a 6-digit access code. After you sign in with your password, you'll enter it on the next screen."
                )}
              </motion.div>
            )}

            {errorMsg && (
              <motion.div variants={itemVariants} className="error-banner">
                {errorMsg}
              </motion.div>
            )}

            {step === "credentials" && (
            <form onSubmit={handleLogin} noValidate>
              <motion.div variants={itemVariants} className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="input-group">
                <label htmlFor="password">Password</label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="forgot-password">
                <button type="button" onClick={handleForgotPassword}>
                  Forgot Password?
                </button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <button className="login-btn" type="submit" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </motion.div>
            </form>
            )}

            {step === "code" && pending && (
              <>
                {notice && (
                  <motion.div variants={itemVariants} className="info-banner">
                    {notice}
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className={`tag${shake ? " shake" : ""}`}>
                  <div className="tag-hole" aria-hidden="true" />
                  <div className="tag-title">Your access code</div>
                  <div className="otp-row" onPaste={handleDigitPaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      className={`otp-box${d ? " filled" : ""}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      aria-label={`Access code digit ${i + 1} of 6`}
                      value={d}
                      autoFocus={i === 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    />
                  ))}
                  </div>
                  <div className="tag-foot">Issued to {pending.userData.name || pending.email}</div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <button
                    className="login-btn"
                    type="button"
                    disabled={!digits.every(Boolean)}
                    onClick={() => verifyCode(digits.join(""))}
                  >
                    Verify &amp; Sign In
                  </button>
                </motion.div>

                <motion.div variants={itemVariants} className="code-actions">
                  <button type="button" onClick={resendCode} disabled={cooldown > 0}>
                    {cooldown > 0 ? `Email my code again (${cooldown}s)` : "Email my code again"}
                  </button>
                  <button type="button" onClick={backToLogin}>
                    ← Back to sign in
                  </button>
                </motion.div>
              </>
            )}

            {step === "credentials" && (
              <motion.p variants={itemVariants} className="footer-text">
                <Link to="/register">Create Account</Link>
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="auth-split-image-col">
        <div className="auth-split-image-frame">
          <img src={HERO_IMAGE} alt="A rescued dog waiting to be adopted" />
          <div className="auth-split-image-caption">
            Every pet here is rescued, vaccinated, and waiting for a home.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
