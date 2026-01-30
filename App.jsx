import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import ProfileSettings from "./pages/ProfileSettings";
import PetMatchmaker from "./pages/PetMatchmaker";

import "leaflet/dist/leaflet.css";

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  // Initialize state directly from localStorage to prevent "flicker" on refresh
  const [user, setUser] = useState(() => {
    const loggedInUser = localStorage.getItem("user");
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });

  useEffect(() => {
    const checkUser = () => {
      const loggedInUser = localStorage.getItem("user");
      setUser(loggedInUser ? JSON.parse(loggedInUser) : null);
    };

    // Sync state if localStorage changes (via your custom event)
    window.addEventListener("authChange", checkUser);
    return () => window.removeEventListener("authChange", checkUser);
  }, []);

  // Helper to handle logout (Call this from Navbar or Profile)
  const handleLogout = () => {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
  };

  return (
    <div className="app-container">
      {/* Passing handleLogout in case your Navbar needs a logout button */}
      <Navbar user={user} onLogout={handleLogout} />

      <main className="content-area" style={{ minHeight: '80vh' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/adopt" element={
            <ProtectedRoute user={user}><Adopt /></ProtectedRoute>
          } />
          <Route path="/vets" element={
            <ProtectedRoute user={user}><VetMap /></ProtectedRoute>
          } />
          <Route path="/quiz" element={
            <ProtectedRoute user={user}><PetMatchmaker /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute user={user}><ProfileSettings /></ProtectedRoute>
          } />
          <Route path="/donate" element={
            <ProtectedRoute user={user}><Donate /></ProtectedRoute>
          } />

          {/* 404 Route */}
          <Route path="*" element={
            <div style={{ padding: '100px', textAlign: 'center' }}>
              <h2>404 - Not Found 🐾</h2>
            </div>
          } />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;