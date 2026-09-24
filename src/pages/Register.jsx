import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
// 1. Import Firebase auth and db
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// "admin" can never be chosen at sign-up. Create admins by hand in Firestore.
const ALLOWED_ROLES = ["adopter", "veterinarian", "shelter"];

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "adopter",
  });
  const [strength, setStrength] = useState({ label: "", color: "#e0e0e0", width: "0%" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Password Strength Logic (Keep as is)
  useEffect(() => {
    const pass = formData.password;
    if (!pass) {
      setStrength({ label: "", color: "#e0e0e0", width: "0%" });
      return;
    }
    const hasLetter = /[A-Za-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    if (pass.length < 8 || !hasLetter || !hasNumber) {
      setStrength({ label: "Weak", color: "#f44336", width: "33%" });
    } else if (pass.length < 12 || !/[^A-Za-z0-9]/.test(pass)) {
      setStrength({ label: "Fair", color: "#ffb300", width: "66%" });
    } else {
      setStrength({ label: "Strong", color: "#2e7d32", width: "100%" });
    }
  }, [formData.password]);

  // Map Firebase auth error codes to friendlier messages
  const getAuthErrorMessage = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Try signing in — if it isn't verified yet, we'll send a new link.";
      case "auth/invalid-email":
        return "That email address doesn't look right.";
      case "auth/weak-password":
        return "Please choose a stronger password.";
      case "auth/operation-not-allowed":
        return "Email/password accounts are currently disabled.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const updateField = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  // Registration: create the account, email a verification link, then sign the
  // person OUT. They can only sign in after clicking the link, which proves the
  // email address is real and theirs.
  const handleRegister = async (e) => {
    e?.preventDefault();

    if (loading) return; // guard against double submits

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const { password, confirmPassword, role } = formData;

    if (!name || !email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!ALLOWED_ROLES.includes(role)) {
      setErrorMsg("Please choose a valid account type.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg("Password must be at least 8 characters and include a letter and a number.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    try {
      // 1. Create the account in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });

      // 2. Save the profile. Vets and shelters start as "pending" until an admin
      //    approves them. (Firestore rules enforce this, so it can't be skipped.)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        status: role === "adopter" ? "approved" : "pending",
        createdAt: new Date().toISOString(),
      });

      // 3. Email the verification link
      let emailSent = true;
      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.error("Verification email failed:", err);
        emailSent = false;
      }

      // 4. Not signed in until the email is verified
      await signOut(auth);
      navigate("/login", { replace: true, state: { registered: true, email, role, emailSent } });
    } catch (error) {
      console.error(error);
      setErrorMsg(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <style>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }
        .register-card {
          background: #ffffff;
          width: 100%;
          max-width: 450px;
          padding: 40px;
          border-radius: 30px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }
        h2 { color: #1b5e20; margin-bottom: 8px; text-align: center; }
        .subtitle { color: #666; text-align: center; margin-bottom: 30px; font-size: 0.9rem; }
        .error-banner {
          background: #fdecea;
          color: #b3261e;
          border: 1px solid #f5c6c2;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.85rem;
          margin-bottom: 18px;
          text-align: center;
        }
        .input-group { margin-bottom: 18px; }
        .input-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          color: #2e7d32;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 2px solid #eee;
          font-size: 1rem;
          box-sizing: border-box;
          outline: none;
          transition: 0.3s;
        }
        input:focus { border-color: #2e7d32; background: #fafafa; }
        .strength-container { margin-top: 8px; }
        .strength-bar-bg { height: 4px; background: #eee; border-radius: 2px; overflow: hidden; }
        .strength-bar-fill { height: 100%; transition: all 0.4s ease; }
        .strength-text { font-size: 0.7rem; font-weight: bold; margin-top: 4px; text-align: right; color: ${strength.color}; }
        .mismatch-text { font-size: 0.7rem; font-weight: bold; margin-top: 4px; color: #f44336; }
        .reg-btn {
          width: 100%;
          padding: 15px;
          background: #2e7d32;
          color: white;
          border: none;
          border-radius: 15px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 20px;
          transition: 0.3s;
        }
        .reg-btn:disabled { background: #ccc; cursor: not-allowed; }
        .reg-btn:hover:not(:disabled) { background: #1b5e20; transform: translateY(-2px); }
        .hint { font-size: 0.72rem; color: #78909c; margin-top: 6px; }
        .footer-link { text-align: center; margin-top: 20px; font-size: 0.9rem; color: #666; }
        .footer-link a { color: #2e7d32; font-weight: 700; text-decoration: none; }
        .footer-link a:hover { text-decoration: underline; }
        select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 2px solid #eee;
          font-size: 1rem;
          box-sizing: border-box;
          outline: none;
          transition: 0.3s;
          background: white;
        }
        select:focus {
          border-color: #2e7d32;
        }
      `}</style>

      <div className="register-card">
        <h2>Create Account</h2>
        <p className="subtitle">Join the community helping pets in Cebu</p>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <form onSubmit={handleRegister} noValidate>
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Juan Dela Cruz"
              value={formData.name}
              onChange={updateField("name")}
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={updateField("email")}
            />
          </div>

          <div className="input-group">
            <label htmlFor="role">Register As</label>
            <select id="role" value={formData.role} onChange={updateField("role")}>
              <option value="adopter">🐾 Adopter</option>
              <option value="veterinarian">🩺 Veterinarian</option>
              <option value="shelter">🏠 Shelter Owner</option>
            </select>
            {formData.role !== "adopter" && (
              <div className="hint">
                Veterinarian and shelter accounts need administrator approval before you can sign in.
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={updateField("password")}
            />
            <div className="hint">At least 8 characters, with a letter and a number.</div>
            <div className="strength-container">
              <div className="strength-bar-bg">
                <div
                  className="strength-bar-fill"
                  style={{ width: strength.width, background: strength.color }}
                ></div>
              </div>
              <div className="strength-text">{strength.label}</div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={updateField("confirmPassword")}
            />
            {formData.confirmPassword &&
              formData.password !== formData.confirmPassword && (
                <div className="mismatch-text">Passwords don't match</div>
              )}
          </div>

          <button className="reg-btn" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Join VetAdopt"}
          </button>
        </form>

        <p className="footer-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;