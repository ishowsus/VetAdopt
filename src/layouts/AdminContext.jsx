// src/layouts/AdminContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
// Import from root src directory
import { db, auth, updateUserPresence } from "../Firebase"; 

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        updateUserPresence(user.uid, true);

        const handleUnload = () => updateUserPresence(user.uid, false);
        window.addEventListener("beforeunload", handleUnload);

        return () => window.removeEventListener("beforeunload", handleUnload);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("createdAt", "desc"));

    const unsubscribeUsers = onSnapshot(
      q,
      (snapshot) => {
        const userList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore user listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribeUsers();
  }, []);

  const updateUserRole = async (userId, newRole) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { role: newRole });
  };

  const updateUserStatus = async (userId, newStatus) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { status: newStatus });
  };

  const pendingCount = users.filter((u) => u.status === "pending").length;
  const onlineCount = users.filter((u) => u.isOnline === true).length;

  return (
    <AdminContext.Provider
      value={{
        users,
        currentUser,
        loading,
        pendingCount,
        onlineCount,
        updateUserRole,
        updateUserStatus,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
