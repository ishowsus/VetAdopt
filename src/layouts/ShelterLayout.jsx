// FILE: src/layouts/ShelterLayout.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { ClipboardList, Heart, Home, LayoutDashboard, MessageSquare, PawPrint, User } from "lucide-react";
import { auth } from "../firebase";
import LogoutModal from "../components/LogoutModal";
import { useUnreadCount } from "../utils/chat";
import DashboardShell, { useUid } from "./dashboard/DashboardShell";

const TITLES = {
  "/shelter/dashboard": "Overview",
  "/shelter/pets": "My pets",
  "/shelter/adoption-requests": "Adoption requests",
  "/shelter/donations": "Donations",
  "/shelter/messages": "Messages",
  "/shelter/profile": "Profile & settings",
};

function ShelterLayout() {
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
      label: "Shelter",
      items: [
        { to: "/shelter/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/shelter/pets", label: "My pets", icon: PawPrint },
        { to: "/shelter/adoption-requests", label: "Adoption requests", icon: ClipboardList },
        { to: "/shelter/donations", label: "Donations", icon: Heart },
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/shelter/messages", label: "Messages", icon: MessageSquare, badge: unread },
        { to: "/shelter/profile", label: "Profile", icon: User },
      ],
    },
  ];

  const me = auth.currentUser;
  return (
    <>
      <DashboardShell
        brand={{ name: "Shelter Portal", subtitle: "Animal shelter", icon: Home }}
        groups={groups}
        titles={TITLES}
        user={{ name: me?.displayName, email: me?.email, role: "Shelter" }}
        onLogout={() => setLogoutOpen(true)}
      />
      <LogoutModal open={logoutOpen} busy={signingOut} onCancel={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}

export default ShelterLayout;