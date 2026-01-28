import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <>
      <style>{`
        .navbar {
          background: #2e7d32;
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
        }

        .nav-inner {
          max-width: 1200px;
          margin: auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
        }

        .logo {
          font-size: 1.8rem;
          font-weight: bold;
          color: #ffffff;
          cursor: pointer;
        }

        .logo span {
          color: #c8e6c9;
        }

        .links {
          display: flex;
          gap: 26px;
          align-items: center;
        }

        .links a {
          color: #e8f5e9;
          text-decoration: none;
          font-weight: 500;
          padding-bottom: 4px;
          transition: all 0.3s ease;
        }

        .links a:hover {
          color: #ffffff;
        }

        .links a.active:not(.donate) {
          border-bottom: 3px solid #c8e6c9;
        }

        .donate {
          background: #ffb300;
          color: #2e7d32 !important;
          padding: 8px 20px;
          border-radius: 30px;
          font-weight: 700;
          transition: 0.3s ease;
        }

        .donate:hover {
          background: #ffa000;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .nav-inner {
            flex-direction: column;
            gap: 14px;
          }

          .links {
            gap: 18px;
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>

      <header className="navbar">
        <div className="nav-inner">
          <div className="logo">
            🐾 Vet<span>Adopt</span>
          </div>

          <nav className="links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/adopt">Adopt</NavLink>
            <NavLink to="/vets">Find Vets</NavLink>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
            <NavLink to="/donate" className="donate">Donate</NavLink>
          </nav>
        </div>
      </header>
    </>
  );
}

export default Navbar;
