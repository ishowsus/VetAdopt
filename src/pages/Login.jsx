import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";

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

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1200&q=80";

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
  const [accessCode, setAccessCode] = useState("");
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

  // Login Function
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

      // 4. Check the unique 6-digit access code (admins are exempt)
      if (role !== "admin") {
        const storedCode = String(userData.accessCode || "");

        // Account made before codes existed: issue one now and show it once.
        if (!storedCode) {
          const newCode = await reserveUniqueAccessCode(user.uid);
          await updateDoc(doc(db, "users", user.uid), { accessCode: newCode });
          await signOut(auth);
          setErrorMsg(
            `Your account now has an access code: ${newCode}. Save it, then sign in again using this code.`
          );
          return;
        }

        if (!/^\d{6}$/.test(accessCode.trim())) {
          await signOut(auth);
          setErrorMsg("Please enter your 6-digit access code.");
          return;
        }

        if (accessCode.trim() !== storedCode) {
          await signOut(auth);
          setErrorMsg("Incorrect access code.");
          return;
        }
      }

      // 5. Save logged in user (App.jsx reads this)
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

      // 6. Redirect based on role
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
        .auth-split {
          min-height: 100vh;
          display: flex;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #14201a;
          background: #fff;
        }

        .auth-split-form-col {
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 960px) {
          .auth-split-form-col { width: 46%; }
        }

        .auth-split-brand {
          padding: 28px 32px 0;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #1b5e20;
        }

        .auth-split-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 32px 48px;
        }

        .auth-split-form {
          width: 100%;
          max-width: 380px;
        }

        .auth-split-form h1 {
          font-size: 1.9rem;
          font-weight: 700;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
          color: #0f2015;
        }

        .auth-split-form .subtitle {
          color: #5b6b60;
          margin: 0 0 28px;
          font-size: 0.95rem;
        }

        .error-banner {
          background: #fdecea;
          color: #b3261e;
          border: 1px solid #f5c6c2;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          margin-bottom: 18px;
        }

        .info-banner {
          background: #e8f5e9;
          color: #1b5e20;
          border: 1px solid #c8e6c9;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          margin-bottom: 18px;
          line-height: 1.4;
        }

        .code-box {
          margin-top: 12px;
          padding: 12px;
          background: #fff;
          border: 1px dashed #2e7d32;
          border-radius: 10px;
          text-align: center;
        }
        .code-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .code-value { font-size: 1.8rem; font-weight: 800; letter-spacing: 0.3em; margin: 4px 0; }
        .code-note { font-size: 0.8rem; }

        .input-group { margin-bottom: 18px; }

        .input-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          color: #1b5e20;
        }

        .auth-split input {
          width: 100%;
          padding: 13px 46px 13px 15px;
          border-radius: 999px;
          border: 1.5px solid #dfe6e1;
          box-sizing: border-box;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s;
        }

        .auth-split input:focus {
          border-color: #2e7d32;
        }

        .password-wrapper { position: relative; }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          border-radius: 999px;
          color: #2e7d32;
          padding: 0;
        }

        .password-toggle:hover { background: rgba(46,125,50,0.08); }

        .forgot-password {
          text-align: right;
          margin-top: -8px;
          margin-bottom: 20px;
        }

        .forgot-password button {
          background: none;
          border: none;
          padding: 0;
          color: #2e7d32;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .forgot-password button:hover { text-decoration: underline; }

        .login-btn {
          width: 100%;
          padding: 15px;
          background: #1b5e20;
          color: white;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: opacity 0.15s;
        }

        .login-btn:hover:not(:disabled) { opacity: 0.9; }
        .login-btn:disabled { background: #a8c8a9; cursor: not-allowed; }

        .footer-text {
          margin-top: 24px;
          font-size: 0.9rem;
          color: #5b6b60;
        }

        .footer-text a { color: #1b5e20; font-weight: 600; text-decoration: none; }
        .footer-text a:hover { text-decoration: underline; }

        .auth-split-image-col {
          display: none;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 960px) {
          .auth-split-image-col {
            display: block;
            width: 54%;
            padding: 16px 16px 16px 0;
          }
        }
        .auth-split-image-frame {
          position: relative;
          height: 100%;
          width: 100%;
          border-radius: 28px;
          overflow: hidden;
        }
        .auth-split-image-frame img {
          height: 100%;
          width: 100%;
          object-fit: cover;
        }
        .auth-split-image-caption {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 24px;
          color: #fff;
          background: rgba(15, 32, 21, 0.45);
          backdrop-filter: blur(6px);
          padding: 16px 20px;
          border-radius: 16px;
          font-size: 0.95rem;
          line-height: 1.4;
        }
      `}</style>

      <div className="auth-split-form-col">
        <div className="auth-split-brand">VETADOPT</div>

        <div className="auth-split-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="auth-split-form"
          >
            <motion.div variants={itemVariants}>
              <h1>Welcome back</h1>
              <p className="subtitle">Ready to find your new best friend?</p>
            </motion.div>

            {justRegistered && !errorMsg && (
              <motion.div variants={itemVariants} className="info-banner">
                {justRegistered.emailSent === false
                  ? "Account created, but we couldn't send the verification email. Sign in below and we'll send a new link."
                  : `Account created! We sent a verification link to ${justRegistered.email}. Click it, then sign in.`}
                {justRegistered.accessCode && (
                  <div className="code-box">
                    <div className="code-label">Your 6-digit access code</div>
                    <div className="code-value">{justRegistered.accessCode}</div>
                    <div className="code-note">
                      Save it now — you'll need it every time you sign in.
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {errorMsg && (
              <motion.div variants={itemVariants} className="error-banner">
                {errorMsg}
              </motion.div>
            )}

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

              <motion.div variants={itemVariants} className="input-group">
                <label htmlFor="accessCode">Access Code</label>
                <input
                  id="accessCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="6-digit code (not needed for admins)"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
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

            <motion.p variants={itemVariants} className="footer-text">
              <Link to="/register">Create Account</Link>
            </motion.p>
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