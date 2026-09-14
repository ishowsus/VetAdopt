import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
<<<<<<< HEAD
import EnhancedChatbot from "./components/EnhancedChatbot";
=======
import EnhancedChatbot from "./components/EnhancedChatbot"; // 1. Updated Import
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7

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

<<<<<<< HEAD
// Admin Context & Layout
import { AdminProvider } from "./layouts/AdminContext";
import AdminLayout from "./layouts/AdminLayout";
import AdminAnimals from "./layouts/AdminAnimals"; // <-- Added import
=======
// Admin Pages & Layout
import AdminLayout from "./layouts/AdminLayout";
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";

// Vet Pages & Layout
import VetLayout from "./layouts/VetLayout";
import VetDashboard from "./pages/veterinarian/VetDashboard";
import Patients from "./pages/veterinarian/Patients";
import Appointment from "./pages/veterinarian/Appointment";
import MedicalRecords from "./pages/veterinarian/MedicalRecords";
import VetProfile from "./pages/veterinarian/VetProfile";

// Shelter Pages & Layout
import ShelterLayout from "./layouts/ShelterLayout";
import ShelterDashboard from "./pages/Shelter/ShelterDashboard";
import ShelterPets from "./pages/Shelter/Pets";
import AdoptionRequests from "./pages/Shelter/AdoptionRequests";
import Donations from "./pages/Shelter/Donations";
import ShelterProfile from "./pages/Shelter/ShelterProfile";

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

        .content-area {
          flex: 1;
          min-height: 80vh;
          margin-left: var(--sidebar-width, 260px);
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: calc(100% - var(--sidebar-width, 260px));
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* Prevent content from breaking page boundaries when sidebar changes */
        .content-area > * {
          max-width: 100%;
        }

        /* ── Mobile Layout Adjustments ── */
        @media (max-width: 768px) {
          .content-area {
            margin-left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="main-wrapper">
        {/* Render Sidebar instead of standard top Navbar */}
        <Sidebar user={user} />

        <main className="content-area">
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

<<<<<<< HEAD
            {/* Admin Routes with AdminProvider Wrap */}
=======
            {/* Admin Routes */}
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute user={user} roles={["admin"]}>
<<<<<<< HEAD
                  <AdminProvider>
                    <AdminLayout />
                  </AdminProvider>
=======
                  <AdminLayout />
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users" element={<Users />} />
<<<<<<< HEAD
              <Route path="animal" element={<AdminAnimals />} /> {/* <-- Route added here */}
=======
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
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

          {/* Footer now flows naturally inside the main content area */}
          <Footer />
        </main>
      </div>

<<<<<<< HEAD
      {/* Floating Enhanced Chatbot */}
=======
      {/* 2. Floating Enhanced Chatbot placed here */}
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
      <EnhancedChatbot user={user} />
    </div>
  );
}

<<<<<<< HEAD
export default App;
=======
export default App;
>>>>>>> 22a7c16f039a290b92aa2e972aaa8a338ae8ffe7
