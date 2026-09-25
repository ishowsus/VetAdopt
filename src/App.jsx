import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import EnhancedChatbot from "./components/EnhancedChatbot";

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

// Admin Context & Layout
import { AdminProvider } from "./layouts/AdminContext";
import AdminLayout from "./layouts/AdminLayout";
import AdminAnimals from "./layouts/AdminAnimals";

// Admin Pages
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";

// Vet Pages & Layout
import VetLayout from "./layouts/VetLayout";
import VetDashboard from "./pages/Veterinarian/VetDashboard";
import Patients from "./pages/Veterinarian/Patients";
import Appointment from "./pages/Veterinarian/Appointment";
import MedicalRecords from "./pages/Veterinarian/MedicalRecords";
import VetProfile from "./pages/Veterinarian/VetProfile";

// Shelter Pages & Layout
import ShelterLayout from "./layouts/ShelterLayout";
import ShelterDashboard from "./pages/Shelter/ShelterDashboard";
import ShelterPets from "./pages/Shelter/Pets";
import AdoptionRequests from "./pages/Shelter/AdoptionRequests";
import Donations from "./pages/Shelter/Donations";
import ShelterProfile from "./pages/Shelter/ShelterProfile";

// Roles are compared after normalizing, so "vet", "Vet" and "veterinarian"
// all count as the same role (and "Shelter" matches "shelter").
const ROLE_ALIASES = { vet: "veterinarian", veterinarian: "veterinarian" };
const normalizeRole = (role) => {
  const r = String(role || "").trim().toLowerCase();
  return ROLE_ALIASES[r] || r;
};

// Where each role lands when it opens a page meant for another role, and
// where it lands right after logging in. Adopters go to the Adopt page;
// admin/vet/shelter go to their own dashboard shells.
const ROLE_HOME = {
  adopter: "/adopt",
  admin: "/admin/dashboard",
  veterinarian: "/vet/dashboard",
  shelter: "/shelter/dashboard",
};

// Dashboard a user lands on after logging in.
const getLanding = (user) => (user ? ROLE_HOME[normalizeRole(user.role)] || null : null);

// ProtectedRoute wrapper
const ProtectedRoute = ({ user, children, roles }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (roles) {
    const role = normalizeRole(user.role);
    if (!roles.map(normalizeRole).includes(role)) {
      return <Navigate to={ROLE_HOME[role] || "/"} replace />;
    }
  }
  return children;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Dashboard shells (admin / vet / shelter) own their navigation.
  // Hide the global top Navbar there to avoid double nav + double offset.
  // Auth pages (login / register) are also navbar-free for a focused, full-width layout.
  const isDashboardRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/vet") ||
    location.pathname.startsWith("/shelter");
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";
  const hideGlobalSidebar = isDashboardRoute || isAuthRoute;

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

    // Sync across browser tabs
    const handleStorage = (e) => {
      if (e.key === "user") checkUser();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("authChange", checkUser);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // After a fresh login, send the user to their role's landing page —
  // /adopt for adopters, their dashboard for admin/vet/shelter — whatever
  // page the Login screen navigates to. (A page refresh while already
  // logged in is not a "fresh login", so it never redirects.)
  const prevUser = useRef(user);
  const pendingLanding = useRef(false);
  useEffect(() => {
    if (!prevUser.current && user) pendingLanding.current = true;
    prevUser.current = user;

    if (!user) {
      pendingLanding.current = false;
      return;
    }
    if (!pendingLanding.current) return;

    const landing = getLanding(user);
    if (!landing) {
      pendingLanding.current = false; // unknown role: keep the normal flow
      return;
    }
    if (location.pathname.startsWith("/" + landing.split("/")[1])) {
      pendingLanding.current = false; // already there
      return;
    }
    navigate(landing, { replace: true });
  }, [user, location.pathname, navigate]);

  return (
    <div className="app-shell">
      <style>{`
        /* ── Dynamic Layout Engine ── */
        .app-shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .main-wrapper {
          display: flex;
          flex: 1;
          width: 100%;
        }

        /* Room for the fixed top Navbar on public pages */
        .main-wrapper.with-navbar {
          padding-top: var(--navbar-height, 64px);
        }

        .content-area {
          flex: 1;
          min-height: 80vh;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .content-area.no-sidebar {
          margin-left: 0;
          width: 100%;
        }

        /* Prevent content from breaking page boundaries when sidebar changes */
        .content-area > * {
          max-width: 100%;
        }

        /* ── Mobile Layout Adjustments ── */
        @media (max-width: 768px) {
          .main-wrapper.with-navbar {
            padding-top: var(--navbar-height, 64px);
          }
        }
      `}</style>

      <div className={hideGlobalSidebar ? "main-wrapper" : "main-wrapper with-navbar"}>
        {!hideGlobalSidebar && <Navbar user={user} />}

        <main className={hideGlobalSidebar ? "content-area no-sidebar" : "content-area"}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/login"
              element={getLanding(user) ? <Navigate to={getLanding(user)} replace /> : <Login />}
            />
            <Route
              path="/register"
              element={getLanding(user) ? <Navigate to={getLanding(user)} replace /> : <Register />}
            />

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
                  <AdminProvider>
                    <AdminLayout />
                  </AdminProvider>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="animals" element={<AdminAnimals />} />
              <Route path="animal" element={<Navigate to="/admin/animals" replace />} />
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

            {/* Vet Routes */}
            <Route
              path="/vet/*"
              element={
                <ProtectedRoute user={user} roles={["veterinarian"]}>
                  <VetLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<VetDashboard />} />
              <Route path="patients" element={<Patients />} />
              <Route path="appointments" element={<Appointment />} />
              <Route path="medical-records" element={<MedicalRecords />} />
              <Route path="profile" element={<VetProfile />} />
              <Route
                path="*"
                element={
                  <div style={{ padding: "100px", textAlign: "center" }}>
                    <h2>Vet Page Not Found 🐾</h2>
                  </div>
                }
              />
            </Route>

            {/* Shelter Routes */}
            <Route
              path="/shelter/*"
              element={
                <ProtectedRoute user={user} roles={["shelter"]}>
                  <ShelterLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<ShelterDashboard />} />
              <Route path="pets" element={<ShelterPets />} />
              <Route path="adoption-requests" element={<AdoptionRequests />} />
              <Route path="donations" element={<Donations />} />
              <Route path="profile" element={<ShelterProfile />} />
              <Route
                path="*"
                element={
                  <div style={{ padding: "100px", textAlign: "center" }}>
                    <h2>Shelter Page Not Found 🐾</h2>
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

          {!isDashboardRoute && <Footer />}
        </main>
      </div>

      <EnhancedChatbot user={user} />
    </div>
  );
}

export default App;