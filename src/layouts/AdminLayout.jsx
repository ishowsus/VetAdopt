// FILE: src/layouts/AdminLayout.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Flag, LayoutDashboard, ListChecks, PawPrint, Settings, ShieldCheck, Users } from "lucide-react";
import { auth, db } from "../firebase";
import LogoutModal from "../components/LogoutModal";
import DashboardShell from "./dashboard/DashboardShell";

// ─── External Trigger Helper ─────────────────────────────────
// Child components or other modules can still call triggerNotification("text").
// It now shows a short message at the bottom-right of the admin area.
let externalAddNotification = null;

export const triggerNotification = (text) => {
  if (externalAddNotification) {
    externalAddNotification(text);
  } else {
    console.warn("triggerNotification called before AdminLayout mounted.");
  }
};

const TITLES = {
  "/admin/dashboard": "Overview",
  "/admin/users": "User management",
  "/admin/verifications": "Verification requests",
  "/admin/listings": "Pet listings",
  "/admin/adoption-listings": "Adoption listings",
  "/admin/reports": "Analytics & reports",
  "/admin/animals": "Animal listings",
  "/admin/settings": "System settings",
};

// Live counts for the sidebar badges.
function useNavBadges() {
  const [counts, setCounts] = useState({ users: 0, verifications: 0, listings: 0 });
  useEffect(() => {
    const watch = (q, key) =>
      onSnapshot(q, (s) => setCounts((c) => ({ ...c, [key]: s.size })), () => {});
    const unsubs = [
      watch(query(collection(db, "users"), where("status", "==", "pending")), "users"),
      watch(query(collection(db, "verifications"), where("status", "==", "pending")), "verifications"),
      watch(query(collection(db, "pets"), where("status", "==", "Pending Review")), "listings"),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);
  return counts;
}

const AdminLayout = () => {
  const navigate = useNavigate();
  const badges = useNavBadges();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("adminDarkMode") === "true");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem("adminDarkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    externalAddNotification = (text) => {
      setToast(text);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 5000);
    };
    return () => {
      externalAddNotification = null;
      clearTimeout(toastTimer.current);
    };
  }, []);

  // Logged-in admin info (Login.jsx stores { uid, email, role, status } in localStorage)
  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  })();

  const handleLogout = async () => {
    setLogoutOpen(false);
    try {
      await signOut(auth); // fully end the Firebase session too
    } catch (error) {
      console.error(error);
    }
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  const groups = [
    { label: "Overview", items: [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Management",
      items: [
        { to: "/admin/users", label: "Users", icon: Users, badge: badges.users },
        { to: "/admin/verifications", label: "Verifications", icon: ShieldCheck, badge: badges.verifications },
        { to: "/admin/listings", label: "Listings", icon: ListChecks, badge: badges.listings },
        { to: "/admin/animals", label: "Animals", icon: PawPrint },
        { to: "/admin/reports", label: "Reports", icon: Flag },
      ],
    },
    { label: "System", items: [{ to: "/admin/settings", label: "Settings", icon: Settings }] },
  ];

  // Existing admin pages read these variables, so they keep working in light and dark mode.
  const vars = {
    "--bg-main": darkMode ? "#0f172a" : "#f8fafc",
    "--bg-card": darkMode ? "#1e293b" : "#ffffff",
    "--bg-card-border": darkMode ? "#334155" : "#e2e8f0",
    "--sidebar-bg": darkMode ? "#0f172a" : "#1e293b",
    "--text-main": darkMode ? "#f8fafc" : "#0f172a",
    "--text-muted": darkMode ? "#94a3b8" : "#64748b",
    "--accent": "#3b82f6",
    "--accent-hover": "#2563eb",
    "--accent-subtle": darkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)",
  };

  return (
    <>
      <DashboardShell
        brand={{ name: "VetAdopt Admin", subtitle: "Administration", icon: PawPrint }}
        groups={groups}
        titles={TITLES}
        user={{ name: adminUser?.email, email: adminUser?.email, role: adminUser?.role || "admin" }}
        onLogout={() => setLogoutOpen(true)}
        theme={{ dark: darkMode, onToggle: () => setDarkMode((d) => !d) }}
        vars={vars}
        toast={toast}
      />
      <LogoutModal open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
};

export default AdminLayout;