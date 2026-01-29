import { NavLink, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  
  // 1. Check if user is logged in
  const user = JSON.parse(localStorage.getItem("user"));

  // 2. Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    alert("Logged out successfully!");
    navigate("/login");
  };

  return (
    <>
      <style>{`
        .navbar {
          background: #2e7d32;
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .nav-inner {
          max-width: 1200px;
          margin: auto;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 1.6rem;
          font-weight: 800;
          color: #ffffff;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo span { color: #c8e6c9; }

        .links {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .links a {
          color: #e8f5e9;
          text-decoration: none;
          font-weight: 500;
          padding: 6px 0;
          transition: 0.3s;
          font-size: 0.95rem;
        }

        .links a:hover { color: #ffffff; }

        .links a.active:not(.donate):not(.logout-btn) {
          border-bottom: 3px solid #c8e6c9;
        }

        /* Specialized Buttons */
        .donate {
          background: #ffb300;
          color: #2e7d32 !important;
          padding: 8px 20px !important;
          border-radius: 30px;
          font-weight: 700;
        }

        .logout-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #ffcdd2 !important;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          cursor: pointer;
          font-size: 0.85rem;
          transition: 0.3s;
        }

        .logout-btn:hover { background: #d32f2f; color: white !important; }

        .user-profile-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c8e6c9 !important;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .nav-inner { flex-direction: column; gap: 15px; padding: 15px; }
          .links { gap: 12px; font-size: 0.85rem; justify-content: center; }
        }
      `}</style>

      <header className="navbar">
        <div className="nav-inner">
          <NavLink to="/" className="logo">
            🐾 Vet<span>Adopt</span>
          </NavLink>

          <nav className="links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/adopt">Adopt</NavLink>
            <NavLink to="/vets">Vets</NavLink>
            <NavLink to="/quiz">Matchmaker</NavLink>

            {/* 3. Conditional Rendering based on Auth State */}
            {user ? (
              <>
                <NavLink to="/profile" className="user-profile-link">
                  👤 {user.name?.split(' ')[0] || "Profile"}
                </NavLink>
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            )}

            <NavLink to="/donate" className="donate">Donate</NavLink>
          </nav>
        </div>
      </header>
    </>
  );
}

export default Navbar;