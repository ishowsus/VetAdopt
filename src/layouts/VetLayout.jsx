// FILE: src/layouts/VetLayout.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { CalendarDays, FileText, LayoutDashboard, MessageSquare, PawPrint, Stethoscope, User } from "lucide-react";
import { auth } from "../firebase";
import LogoutModal from "../components/LogoutModal";
import { useUnreadCount } from "../utils/chat";
import DashboardShell, { useUid } from "./dashboard/DashboardShell";

const TITLES = {
  "/vet/dashboard": "Overview",
  "/vet/patients": "Patients",
  "/vet/appointments": "Appointments",
  "/vet/medical-records": "Medical records",
  "/vet/messages": "Messages",
  "/vet/profile": "Profile & settings",
};

function VetLayout() {
  const navigate = useNavigate();
  const uid = useUid();
  const unread = useUnreadCount(uid);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      // Keep App.jsx state in sync: Firebase signOut alone leaves localStorage.user set.
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange"));
      navigate("/login");
    } catch (error) {
      console.error(error);
      setSigningOut(false);
    }
  };

  const groups = [
    {
      label: "Clinic",
      items: [
        { to: "/vet/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/vet/patients", label: "Patients", icon: PawPrint },
        { to: "/vet/appointments", label: "Appointments", icon: CalendarDays },
        { to: "/vet/medical-records", label: "Medical records", icon: FileText },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/vet/messages", label: "Messages", icon: MessageSquare, badge: unread },
        { to: "/vet/profile", label: "Profile", icon: User },
      ],
    },
  ];

  const me = auth.currentUser;
  return (
    <>
      <DashboardShell
        brand={{ name: "VetPortal", subtitle: "Veterinary clinic", icon: Stethoscope }}
        groups={groups}
        titles={TITLES}
        user={{ name: me?.displayName, email: me?.email, role: "Veterinarian" }}
        onLogout={() => setLogoutOpen(true)}
      />
      <LogoutModal open={logoutOpen} busy={signingOut} onCancel={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}

export default VetLayout;