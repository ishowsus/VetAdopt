import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Public Pages
import Home from "./pages/Home";
import About from "./pages/AboutUs";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Donate from "./pages/Donate";
import Adopt from "./pages/Adopt";
import VetMap from "./pages/VetMap";
import ProfileSettings from "./pages/ProfileSettings";
import PetMatchmaker from "./pages/PetMatchmaker";

// Admin Pages & Layout
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";

// ProtectedRoute wrapper
const ProtectedRoute = ({ user, children, roles }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const navigate = useNavigate();

  // Initialize user state from localStorage
  const [user, setUser] = useState(() => {
    const loggedInUser = localStorage.getItem("user");
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });

  useEffect(() => {
    const checkUser = () => {
      const loggedInUser = localStorage.getItem("user");
      setUser(loggedInUser ? JSON.parse(loggedInUser) : null);
    };

    window.addEventListener("authChange", checkUser);

    // Optional: sync across browser tabs
    const handleStorage = (e) => {
      if (e.key === "user") checkUser();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("authChange", checkUser);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="content-area" style={{ minHeight: "80vh" }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected User Routes */}
          <Route path="/adopt" element={<ProtectedRoute user={user}><Adopt /></ProtectedRoute>} />
          <Route path="/vets" element={<ProtectedRoute user={user}><VetMap /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute user={user}><PetMatchmaker /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute user={user}><ProfileSettings /></ProtectedRoute>} />
          <Route path="/donate" element={<ProtectedRoute user={user}><Donate /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute user={user} roles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <div style={{ padding: "100px", textAlign: "center" }}>
                  <h2>Admin Page Not Found 🐾</h2>
                </div>
              }
            />
          </Route>

          {/* General 404 */}
          <Route
            path="*"
            element={
              <div style={{ padding: "100px", textAlign: "center" }}>
                <h2>404 - Not Found 🐾</h2>
              </div>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
  