import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";

// 1. Import Firebase auth and db
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// "admin" can never be chosen at sign-up. Create admins by hand in Firestore.
const ALLOWED_ROLES = ["adopter", "veterinarian", "shelter"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
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
          margin: 0 0 24px;
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

        .input-group { margin-bottom: 16px; }

        .input-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 0.8rem;
          color: #1b5e20;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .auth-split input,
        .auth-split select {
          width: 100%;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1.5px solid #dfe6e1;
          box-sizing: border-box;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s;
          background: #fff;
        }

        .auth-split input:focus,
        .auth-split select:focus {
          border-color: #2e7d32;
        }

        .role-hint {
          font-size: 0.75rem;
          color: #78909c;
          margin-top: 6px;
        }

        .strength-container { margin-top: 8px; }
        .strength-bar-bg { height: 4px; background: #eee; border-radius: 2px; overflow: hidden; }
        .strength-bar-fill { height: 100%; transition: all 0.4s ease; }
        .strength-text { font-size: 0.7rem; font-weight: 700; margin-top: 4px; text-align: right; }
        .mismatch-text { font-size: 0.7rem; font-weight: 700; margin-top: 4px; color: #f44336; }

        .reg-btn {
          width: 100%;
          padding: 15px;
          background: #1b5e20;
          color: white;
          border: none;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          margin-top: 6px;
          transition: opacity 0.15s;
        }
        .reg-btn:disabled { background: #a8c8a9; cursor: not-allowed; }
        .reg-btn:hover:not(:disabled) { opacity: 0.9; }

        .footer-link {
          margin-top: 22px;
          font-size: 0.9rem;
          color: #5b6b60;
        }
        .footer-link a { color: #1b5e20; font-weight: 600; text-decoration: none; }
        .footer-link a:hover { text-decoration: underline; }

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
        <div className="auth-split-brand">🐾 VetAdopt</div>

        <div className="auth-split-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="auth-split-form"
          >
            <motion.div variants={itemVariants}>
              <h1>Create your account</h1>
              <p className="subtitle">Join the community helping pets in Cebu.</p>
            </motion.div>

            {errorMsg && (
              <motion.div variants={itemVariants} className="error-banner">
                {errorMsg}
              </motion.div>
            )}

            <form onSubmit={handleRegister} noValidate>
              <motion.div variants={itemVariants} className="input-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                  value={formData.name}
                  onChange={updateField("name")}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={updateField("email")}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="input-group">
                <label htmlFor="role">Register As</label>
                <select id="role" value={formData.role} onChange={updateField("role")}>
                  <option value="adopter">🐾 Adopter</option>
                  <option value="veterinarian">🩺 Veterinarian</option>
                  <option value="shelter">🏠 Shelter Owner</option>
                </select>
                {formData.role !== "adopter" && (
                  <div className="role-hint">
                    Veterinarian and shelter accounts need administrator approval before you can sign in.
                  </div>
                )}
              </motion.div>

              <motion.div variants={itemVariants} className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={updateField("password")}
                />
                <div className="role-hint">At least 8 characters, with a letter and a number.</div>
                <div className="strength-container">
                  <div className="strength-bar-bg">
                    <div
                      className="strength-bar-fill"
                      style={{ width: strength.width, background: strength.color }}
                    ></div>
                  </div>
                  <div className="strength-text" style={{ color: strength.color }}>
                    {strength.label}
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="input-group">
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
              </motion.div>

              <motion.div variants={itemVariants}>
                <button className="reg-btn" type="submit" disabled={loading}>
                  {loading ? "Creating Account..." : "Join VetAdopt"}
                </button>
              </motion.div>
            </form>

            <motion.p variants={itemVariants} className="footer-link">
              Already have an account? <Link to="/login">Login</Link>
            </motion.p>
          </motion.div>
        </div>
      </div>

      <div className="auth-split-image-col">
        <div className="auth-split-image-frame">
          <img src={HERO_IMAGE} alt="A cat resting, waiting to be adopted" />
          <div className="auth-split-image-caption">
            Create an account to start browsing pets or list one for adoption.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;