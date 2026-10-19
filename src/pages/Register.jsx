import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { FaPaw } from "react-icons/fa";

// 1. Import Firebase auth and db
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { reserveUniqueAccessCode } from "../accessCode";
import { sendAccessCodeEmail } from "../sendAccessCodeEmail";

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

    // Track progress so a failure can be reported and cleaned up properly.
    let step = "creating the account";
    let createdUser = null;
    let profileSaved = false;

    try {
      // 1. Create the account in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = user;
      step = "setting the display name";
      await updateProfile(user, { displayName: name });

      // 2. Reserve a unique 6-digit access code for this user. After email +
      //    password, the login page asks for it on a second screen.
      step = "reserving the access code (accessCodes rules)";
      const accessCode = await reserveUniqueAccessCode(user.uid);

      // 3. Save the profile. Everyone starts "active"; admins can later
      //    suspend or ban the account from the Users page.
      step = "saving the profile (users rules)";
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        status: "active",
        accessCode,
        createdAt: new Date().toISOString(),
      });
      profileSaved = true;

      // 4. Email the access code. If that fails, we show the code on the login
      //    page instead so the user isn't locked out.
      let codeEmailSent = true;
      try {
        await sendAccessCodeEmail({ email, name, code: accessCode });
      } catch (err) {
        console.error("Access code email failed:", err);
        codeEmailSent = false;
      }

      // 5. Email the verification link
      let emailSent = true;
      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.error("Verification email failed:", err);
        emailSent = false;
      }

      // 6. Not signed in until the email is verified. The code is only passed
      //    along (and shown) when the email couldn't be sent.
      await signOut(auth);
      navigate("/login", {
        replace: true,
        state: {
          registered: true,
          email,
          role,
          emailSent,
          codeEmailSent,
          accessCode: codeEmailSent ? undefined : accessCode,
        },
      });
    } catch (error) {
      console.error(`Registration failed while ${step}:`, error);

      // If the account was created but the profile never got saved, remove the
      // half-made account so the person can simply try again with the same email
      // (otherwise they'd hit "email already in use" with no profile behind it).
      if (createdUser && !profileSaved) {
        try {
          await createdUser.delete();
        } catch (cleanupErr) {
          console.error("Couldn't remove the incomplete account:", cleanupErr);
        }
      }

      if (error.code === "permission-denied") {
        setErrorMsg(
          `Firestore blocked the sign-up while ${step}. Check that your security rules are published, then try again.`
        );
      } else {
        setErrorMsg(getAuthErrorMessage(error));
      }
    } finally {
      setLoading(false);
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
                  <option value="adopter">Adopter</option>
                  <option value="veterinarian">Veterinarian</option>
                  <option value="shelter">Shelter Owner</option>
                </select>
                <div className="role-hint">
                  We'll email you a unique 6-digit access code when you sign up. After you sign in with your password, you'll enter it on a second screen.
                </div>
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