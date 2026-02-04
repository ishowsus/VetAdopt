import { useState } from "react";
import { useNavigate } from "react-router-dom";
// Firebase imports
import { auth, db } from "../Firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- FIXED: Firebase Logic with Role Support ---
  const handleLogin = async () => {
    if (!email || !password) return alert("Please fill in all fields");

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role = userDoc.data()?.role || "user"; // default to 'user'

      // 3. Store user info in localStorage
      const userData = {
        uid: user.uid,
        email: user.email,
        role, // important for admin routes
      };
      localStorage.setItem("user", JSON.stringify(userData));

      // 4. Trigger authChange event so Navbar / ProtectedRoute updates
      window.dispatchEvent(new Event("authChange"));

      // 5. Redirect based on role
      if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/profile");
      }

    } catch (error) {
      console.error(error);
      alert("Invalid email or password. Please try again.");
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
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          width: 100%;
          max-width: 420px;
          padding: 50px 40px;
          border-radius: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          text-align: center;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .brand-logo { font-size: 2.5rem; margin-bottom: 10px; display: inline-block; }
        h2 { color: #1b5e20; margin: 0 0 10px 0; font-size: 1.8rem; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 0.95rem; }

        .input-group { position: relative; margin-bottom: 20px; text-align: left; }
        .input-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #2e7d32;
          margin-bottom: 8px;
          margin-left: 5px;
        }

        input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: 2px solid #e0e0e0;
          font-size: 1rem;
          box-sizing: border-box;
          transition: all 0.3s ease;
          outline: none;
        }

        input:focus {
          border-color: #2e7d32;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 35px;
          top: 40px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #000000;
          font-weight: 600;
        }

        .login-btn {
          width: 100%;
          padding: 16px;
          background: #2e7d32;
          color: white;
          border: none;
          border-radius: 15px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 10px;
        }

        .login-btn:hover {
          background: #1b5e20;
          transform: translateY(-2px);
        }

        .footer-text { margin-top: 25px; font-size: 0.9rem; color: #666; }
        .footer-text span { color: #2e7d32; font-weight: 700; cursor: pointer; text-decoration: underline; }
      `}</style>

      <div className="login-card">
        <div className="brand-logo">🐾</div>
        <h2>Welcome Back</h2>
        <p className="subtitle">Ready to find your new best friend?</p>

        <div className="input-group">
          <label>EMAIL ADDRESS</label>
          <input 
            type="email" 
            placeholder="name@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>

        <div className="input-group">
          <label>PASSWORD</label>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <span 
            className="password-toggle" 
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "HIDE" : "SHOW"}
          </span>
        </div>

        <button className="login-btn" onClick={handleLogin}>
          Sign In
        </button>

        <p className="footer-text">
          New to VetAdopt? <span onClick={() => navigate("/register")}>Create account</span>
        </p>
      </div>
    </div>
  );
}

export default Login;
