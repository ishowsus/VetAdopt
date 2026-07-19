import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Firebase imports
import { auth, db } from "../Firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Login() {
  const navigate = useNavigate();

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

  if (!email || !password) {
    setErrorMsg("Please fill in all fields.");
    return;
  }

  setErrorMsg("");
  setLoading(true);

  try {
    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      throw new Error("User data not found.");
    }

    const userData = userDoc.data();

    const role = userData.role || "adopter";
    const status = userData.status || "approved";

    // Check if account needs admin approval
    if (
      (role === "veterinarian" || role === "shelter") &&
      status !== "approved"
    ) {
      setErrorMsg(
        "Your account is waiting for administrator approval."
      );
      return;
    }

    // Save logged in user
    localStorage.setItem(
      "user",
      JSON.stringify({
        uid: user.uid,
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
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg,#e8f5e9,#c8e6c9);
          padding:20px;
          font-family: Arial, sans-serif;
        }

        .login-card{
          background:white;
          width:100%;
          max-width:420px;
          padding:40px;
          border-radius:20px;
          box-shadow:0 10px 30px rgba(0,0,0,.1);
        }

        h2{
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

        input{
          width:100%;
          padding:14px;
          border-radius:10px;
          border:2px solid #ddd;
          box-sizing:border-box;
          font-size:16px;
        }

        input:focus{
          outline:none;
          border-color:#2e7d32;
        }

        .password-toggle{
          position:absolute;
          right:10px;
          top:36px;
          cursor:pointer;
          font-size:12px;
          font-weight:bold;
          background:none;
          border:none;
          color:#2e7d32;
          padding:8px;
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
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
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