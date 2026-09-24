import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

// Firebase imports
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered ? location.state : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // Accounts created before approvals existed have no status: treat as approved.
      // New sign-ups always get one (see Register.jsx).
      const status = String(userData.status || "approved").trim().toLowerCase();

      // 3. Vets and shelters must be approved by an administrator first
      const needsApproval = ["veterinarian", "vet", "shelter"].includes(role);
      if (needsApproval && status !== "approved") {
        await signOut(auth);
        setErrorMsg(
          status === "pending"
            ? "Your account is waiting for administrator approval."
            : "Your account hasn't been approved. Please contact support."
        );
        return;
      }

      // 4. Save logged in user (App.jsx reads this)
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

      // 5. Redirect based on role
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
          navigate("/profile");
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
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: calc(100vh - 170px); /* leave room for the footer below (≈60px margin + ≈110px footer) so the page fits the viewport without a stray scroll */
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg,#e8f5e9,#c8e6c9);
          padding:20px;
          font-family: Arial, sans-serif;
          border-radius: 0 0 20px 20px;
        }

        .login-card{
          background:white;
          width:100%;
          max-width:420px;
          padding:40px;
          border-radius:20px;
          box-shadow:0 10px 30px rgba(0,0,0,.1);
        }

        /* Scoped to .login-page - bare input/h2 selectors here leaked into
           every other input/h2 rendered on /login (e.g. the chatbot) */
        .login-page h2{
          text-align:center;
          color:#2e7d32;
          margin-bottom:5px;
        }

        .subtitle{
          text-align:center;
          color:#666;
          margin-bottom:25px;
        }

        .error-banner{
          background:#fdecea;
          color:#b3261e;
          border:1px solid #f5c6c2;
          border-radius:8px;
          padding:10px 14px;
          font-size:14px;
          margin-bottom:18px;
          text-align:center;
        }

        .info-banner{
          background:#e8f5e9;
          color:#1b5e20;
          border:1px solid #c8e6c9;
          border-radius:8px;
          padding:10px 14px;
          font-size:14px;
          margin-bottom:18px;
          text-align:center;
          line-height:1.4;
        }

        .input-group{
          margin-bottom:20px;
          position:relative;
        }

        .input-group label{
          display:block;
          margin-bottom:8px;
          font-weight:bold;
          color:#2e7d32;
        }

        .login-page input{
          width:100%;
          padding:14px 46px 14px 14px; /* extra right padding so text doesn't run under the eye icon */
          border-radius:10px;
          border:2px solid #ddd;
          box-sizing:border-box;
          font-size:16px;
        }

        .login-page input:focus{
          outline:none;
          border-color:#2e7d32;
        }

        /* Dedicated wrapper around the password input only — the toggle is
           centered against THIS box, not the label+input group, so it always
           sits inside the textbox regardless of label height or global CSS */
        .password-wrapper{
          position:relative;
        }

        .password-wrapper input{
          display:block;
        }

        .password-toggle{
          position:absolute;
          top:50%;
          right:28px; /* raise this number to move the icon further LEFT */
          transform:translateY(-50%);
          width:32px;
          height:32px;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          background:none;
          border:none;
          border-radius:8px;
          color:#2e7d32;
          padding:0;
          z-index:1;
          line-height:0;
        }

        .password-toggle:hover{
          background:rgba(46,125,50,0.08);
        }

        .forgot-password{
          text-align:right;
          margin-top:-8px;
          margin-bottom:20px;
        }

        .forgot-password button{
          background:none;
          border:none;
          padding:0;
          color:#2e7d32;
          cursor:pointer;
          font-size:14px;
          font-weight:bold;
        }

        .forgot-password button:hover{
          text-decoration:underline;
        }

        .login-btn{
          width:100%;
          padding:15px;
          background:#2e7d32;
          color:white;
          border:none;
          border-radius:12px;
          cursor:pointer;
          font-size:16px;
          font-weight:bold;
        }

        .login-btn:hover:not(:disabled){
          background:#1b5e20;
        }

        .login-btn:disabled{
          background:#9ccc9f;
          cursor:not-allowed;
        }

        .footer-text{
          margin-top:20px;
          text-align:center;
        }

        .footer-text a{
          color:#2e7d32;
          font-weight:bold;
          text-decoration:none;
        }

        .footer-text a:hover{
          text-decoration:underline;
        }
      `}</style>

      <div className="login-card">
        <h2>🐾 Welcome Back</h2>
        <p className="subtitle">Ready to find your new best friend?</p>

        {justRegistered && !errorMsg && (
          <div className="info-banner">
            {justRegistered.emailSent === false
              ? "Account created, but we couldn't send the verification email. Sign in below and we'll send a new link."
              : `Account created! We sent a verification link to ${justRegistered.email}. Click it, then sign in.`}
            {justRegistered.role !== "adopter" &&
              " Your account also needs administrator approval before you can sign in."}
          </div>
        )}

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <form onSubmit={handleLogin} noValidate>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
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
                /* Eye-off (password visible → click to hide) */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                /* Eye (password hidden → click to show) */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
              </button>
            </div>
          </div>

          <div className="forgot-password">
            <button type="button" onClick={handleForgotPassword}>
              Forgot Password?
            </button>
          </div>

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="footer-text">
          <Link to="/register">Create Account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;