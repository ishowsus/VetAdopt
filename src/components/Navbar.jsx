import { NavLink, useNavigate } from "react-router-dom";

function Navbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    // Trigger the custom event so App.jsx updates immediately
    window.dispatchEvent(new Event("authChange"));
    navigate("/");
  };

  return (
    <header className="navbar" style={{ background: '#55420f', padding: '12px' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: 'auto' }}>
        <NavLink to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.5rem' }}>
          🐾 VetAdopt
        </NavLink>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <NavLink to="/" style={linkStyle}>Home</NavLink>
          <NavLink to="/about" style={linkStyle}>About</NavLink>

          {/* HIDDEN LINKS - Only show if user is logged in */}
          {user && (
            <>
              <NavLink to="/adopt" style={linkStyle}>Adopt</NavLink>
              <NavLink to="/vets" style={linkStyle}>Vet Map</NavLink>
              <NavLink to="/quiz" style={linkStyle}>Matchmaker</NavLink>
              <NavLink to="/profile" style={{ ...linkStyle, color: '#c8e6c9' }}>
                👤 {user.name?.split(' ')[0] || "Profile"}
              </NavLink>
              <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
            </>
          )}

          {/* SHOW ONLY IF LOGGED OUT */}
          {!user && (
            <>
              <NavLink to="/login" style={linkStyle}>Login</NavLink>
              <NavLink to="/register" style={linkStyle}>Register</NavLink>
            </>
          )}

          <NavLink to="/donate" style={{ background: '#ffb300', padding: '8px 15px', borderRadius: '20px', textDecoration: 'none', color: '#2e7d32', fontWeight: 'bold' }}>
            Donate
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

const linkStyle = { color: '#e8f5e9', textDecoration: 'none', fontSize: '0.95rem' };
const logoutBtnStyle = { background: 'none', border: '1px solid white', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' };

export default Navbar;