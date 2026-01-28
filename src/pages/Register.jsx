import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = () => {
    if (!name || !email || !password || !confirmPassword) return alert("Please fill in all fields");
    if (password !== confirmPassword) return alert("Passwords do not match!");
    alert(`Registration successful! Welcome, ${name}`);
    navigate("/login"); // redirect to login after register
  };

  return (
    <>
      <style>{`
        body { font-family: Arial, sans-serif; background:#f0f4f1; margin:0; }
        .auth-container { max-width: 400px; margin: 100px auto; background:white; border-radius:15px; padding:40px 30px; box-shadow:0 10px 25px rgba(0,0,0,0.1); text-align:center; }
        h2 { color:#2e7d32; margin-bottom:20px; }
        input { width:100%; padding:12px 15px; margin-bottom:15px; border-radius:8px; border:1px solid #ccc; font-size:1rem; }
        button { width:100%; padding:14px 0; background:#2e7d32; color:white; border:none; border-radius:25px; font-weight:bold; cursor:pointer; transition:0.3s; }
        button:hover{ background:#1b5e20; }
        p { margin-top:15px; font-size:0.9rem; color:#555; }
        p span { color:#2e7d32; font-weight:bold; cursor:pointer; }
      `}</style>

      <div className="auth-container">
        <h2>Register</h2>
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <button onClick={handleRegister}>Register</button>
        <p>Already have an account? <span onClick={() => navigate("/login")}>Login</span></p>
      </div>
    </>
  );
}

export default Register;
