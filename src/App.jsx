import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Pages
import Home from "./pages/Home";
import About from "./pages/AboutUs";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Donate from "./pages/Donate";
import Adopt from "./pages/Adopt";
import VetMap from "./pages/VetMap";
import ProfileSettings from "./pages/ProfileSettings"; // New
import PetMatchmaker from "./pages/PetMatchmaker";   // New

import "leaflet/dist/leaflet.css";

// Helper: Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="app-container">
      {/* ScrollToTop ensures the user doesn't stay at the bottom when clicking links */}
      <ScrollToTop />
      
      <Navbar />

      <main className="content-area" style={{ minHeight: '80vh' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/adopt" element={<Adopt />} />
          <Route path="/vets" element={<VetMap />} />
          
          {/* Newly Created Routes */}
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/quiz" element={<PetMatchmaker />} />

          {/* 404 Catch-all (Optional) */}
          <Route path="*" element={<div style={{padding: '100px', textAlign: 'center'}}><h2>404 - Page Not Found 🐾</h2></div>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;