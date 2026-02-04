import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// 1. Import Firebase auth and db
import { auth, db } from "../Firebase"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [strength, setStrength] = useState({ label: "", color: "#e0e0e0", width: "0%" });
  const [loading, setLoading] = useState(false); // Added loading state

  // Password Strength Logic (Keep as is)
  useEffect(() => {
    const pass = formData.password;
    if (!pass) {
      setStrength({ label: "", color: "#e0e0e0", width: "0%" });
      return;
    }
    if (pass.length < 6) {
      setStrength({ label: "Weak", color: "#f44336", width: "33%" });
    } else if (pass.length < 10 || !/[0-9]/.test(pass)) {
      setStrength({ label: "Fair", color: "#ffb300", width: "66%" });
    } else {
      setStrength({ label: "Strong", color: "#2e7d32", width: "100%" });
    }
  }, [formData.password]);

  // 2. Updated Registration Handler
 const handleRegister = async () => {
    const { name, email, password, confirmPassword } = formData;
    
    if (!name || !email || !password) return alert("Please fill in all fields");
    if (password !== confirmPassword) return alert("Passwords do not match");
    if (password.length < 6) return alert("Password must be at least 6 characters");

    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Prepare the user data object
      const userData = {
        uid: user.uid,
        name: name,
        email: email,
        role: "adopter",
        createdAt: new Date().toISOString()
      };

      // 3. Save to Firestore
      await setDoc(doc(db, "users", user.uid), userData);

      // 4. IMPORTANT: Save to localStorage so App.js knows we are logged in
      localStorage.setItem("user", JSON.stringify(userData));

      // 5. Trigger the event to update Navbar/UI
      window.dispatchEvent(new Event("authChange"));
      
      alert(`Welcome to the family, ${name}! 🐾`);
      
      // 6. Redirect to profile
      navigate("/profile");
    } catch (error) {
      console.error(error);
      alert(error.message);
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
        .footer-link { text-align: center; margin-top: 20px; font-size: 0.9rem; color: #666; }
        .footer-link span { color: #2e7d32; font-weight: 700; cursor: pointer; }
      `}</style>

      <div className="register-card">
        <h2>Create Account</h2>
        <p className="subtitle">Join the community helping pets in Cebu</p>

        <div className="input-group">
          <label>Full Name</label>
          <input 
            type="text" 
            placeholder="Juan Dela Cruz" 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
          />
        </div>

        <div className="input-group">
          <label>Email Address</label>
          <input 
            type="email" 
            placeholder="juan@email.com" 
            onChange={(e) => setFormData({...formData, email: e.target.value})} 
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
          />
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
          <label>Confirm Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
          />
        </div>

        <button className="reg-btn" onClick={handleRegister} disabled={loading}>
          {loading ? "Creating Account..." : "Join VetAdopt"}
        </button>

        <p className="footer-link">
          Already have an account? <span onClick={() => navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Register;