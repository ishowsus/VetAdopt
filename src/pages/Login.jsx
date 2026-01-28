import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) return alert("Please fill in all fields");
    
    // Optional: simple email format check
    if (!/\S+@\S+\.\S+/.test(email)) return alert("Please enter a valid email");

    // Save login info for Adopt page
    localStorage.setItem("user", JSON.stringify({ email }));

    alert(`Welcome back, ${email}!`);
    navigate("/adopt"); // redirect to adopt page after login
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
        <h2>Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
        <p>Don't have an account? <span onClick={() => navigate("/register")}>Register</span></p>
      </div>
    </>
  );
}

export default Login;
