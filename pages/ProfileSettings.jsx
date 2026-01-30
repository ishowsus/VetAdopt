import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../Firebase"; 
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function ProfileSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [user, setUser] = useState({ name: "", email: "", role: "Adopter" });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [notifications] = useState([
    { id: 1, text: "🎉 Your application for 'Bruno' has been approved!", date: "2 hours ago" },
    { id: 2, text: "🏥 Reminder: Appointment with Cebu Happy Paws tomorrow.", date: "1 day ago" }
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUser({ ...userDoc.data(), email: currentUser.email });
          } else {
            setUser({ name: currentUser.displayName || "User", email: currentUser.email, role: "Adopter" });
          }
        } catch (error) { console.error(error); }
      } else { navigate("/login"); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSave = async () => {
    if (!user.name.trim()) return alert("Name is required");
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { name: user.name });
      const local = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...local, name: user.name }));
      window.dispatchEvent(new Event("authChange"));
      alert("Changes saved! ✨");
    } catch (e) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  if (loading) return <div className="p-loading">🐾 Loading Profile...</div>;

  return (
    <div className="ps-wrapper">
      <style>{`
        .ps-wrapper { 
          display: flex; justify-content: center; align-items: flex-start;
          min-height: 100vh; background: #f0f4f0; padding: 40px 10px; box-sizing: border-box;
        }
        .ps-card {
          display: flex; width: 100%; max-width: 950px; background: white;
          border-radius: 25px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.05);
          min-height: 600px;
        }
        .ps-sidebar {
          width: 300px; background: #f9fff9; border-right: 1px solid #edf2ed;
          padding: 40px 20px; display: flex; flex-direction: column; align-items: center;
        }
        .ps-avatar-container { position: relative; margin-bottom: 15px; }
        .ps-avatar {
          width: 90px; height: 90px; background: #2e7d32; color: white;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 2.2rem; font-weight: bold; box-shadow: 0 8px 15px rgba(46,125,50,0.2);
        }
        .ps-role-badge {
          background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 800; text-transform: uppercase; margin-top: 10px;
          border: 1px solid #2e7d32;
        }
        .ps-nav { width: 100%; margin-top: 30px; }
        .ps-nav-btn {
          width: 100%; padding: 14px; margin-bottom: 8px; border-radius: 12px;
          border: none; background: transparent; color: #666; font-weight: 600;
          text-align: left; cursor: pointer; transition: 0.2s; display: flex; gap: 10px;
        }
        .ps-nav-btn.active { background: #2e7d32; color: white; }
        .ps-nav-btn:hover:not(.active) { background: #eef5ee; }
        
        .ps-content { flex: 1; padding: 50px; background: white; }
        .ps-header h2 { margin: 0; color: #1a1a1a; font-size: 1.8rem; }
        .ps-header p { color: #888; margin-top: 5px; font-size: 0.9rem; }
        
        .ps-form { margin-top: 35px; }
        .ps-field { margin-bottom: 25px; }
        .ps-field label { 
          display: block; font-size: 0.75rem; font-weight: 700; color: #2e7d32;
          margin-bottom: 8px; text-transform: uppercase;
        }
        .ps-field input {
          width: 100%; padding: 14px; border-radius: 10px; border: 2px solid #eee;
          font-size: 1rem; transition: 0.3s; box-sizing: border-box;
        }
        .ps-field input:focus { border-color: #2e7d32; outline: none; }
        .ps-save-btn {
          background: #2e7d32; color: white; border: none; padding: 16px 30px;
          border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s;
        }
        .ps-save-btn:disabled { background: #ccc; }

        .ps-notif { 
          padding: 15px; border-radius: 12px; border: 1px solid #eee; 
          margin-bottom: 12px; display: flex; gap: 12px; align-items: center;
        }
        @media (max-width: 768px) {
          .ps-card { flex-direction: column; }
          .ps-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #eee; }
        }
      `}</style>

      <div className="ps-card">
        <aside className="ps-sidebar">
          <div className="ps-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : "P"}
          </div>
          <div className="ps-role-badge">{user.role || "Adopter"}</div>
          <h3 style={{marginTop: '15px', marginBottom: '5px'}}>{user.name}</h3>
          <p style={{fontSize: '0.8rem', color: '#888', marginBottom: '20px'}}>{user.email}</p>

          <div className="ps-nav">
            <button className={`ps-nav-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
              👤 Profile Settings
            </button>
            <button className={`ps-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
              🔔 Activity History
            </button>
            <button className="ps-nav-btn" style={{color: '#d32f2f', marginTop: '40px'}} onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </aside>

        <main className="ps-content">
          {activeTab === 'general' ? (
            <div className="ps-form">
              <div className="ps-header">
                <h2>Account Settings</h2>
                <p>Manage your public display name and account details.</p>
              </div>
              <div className="ps-field" style={{marginTop: '30px'}}>
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={user.name} 
                  onChange={(e) => setUser({...user, name: e.target.value})}
                />
              </div>
              <div className="ps-field">
                <label>Email Address (Private)</label>
                <input type="text" value={user.email} readOnly style={{background: '#f5f5f5', color: '#999'}} />
              </div>
              <button className="ps-save-btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <div>
              <div className="ps-header">
                <h2>Activity History</h2>
                <p>Recent updates regarding your pet applications.</p>
              </div>
              <div style={{marginTop: '30px'}}>
                {notifications.map(n => (
                  <div key={n.id} className="ps-notif">
                    <span style={{fontSize: '1.2rem'}}>🐾</span>
                    <div>
                      <div style={{fontWeight: '600', fontSize: '0.9rem'}}>{n.text}</div>
                      <div style={{fontSize: '0.75rem', color: '#999'}}>{n.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProfileSettings;