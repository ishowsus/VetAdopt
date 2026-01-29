import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ProfileSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || {});
  
  const [notifications, setNotifications] = useState([
    { id: 1, text: "🎉 Your application for 'Bruno' has been approved!", date: "2 hours ago", type: "success" },
    { id: 2, text: "🏥 Reminder: Appointment with Cebu Happy Paws tomorrow.", date: "1 day ago", type: "info" }
  ]);

  const handleSave = () => {
    localStorage.setItem("user", JSON.stringify(user));
    alert("Profile updated successfully!");
  };

  return (
    <div className="profile-container">
      <style>{`
        .profile-container { min-height: 100vh; background: #f4f7f4; padding: 40px 20px; font-family: 'Inter', sans-serif; }
        .profile-card { max-width: 900px; margin: auto; background: white; border-radius: 30px; display: flex; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .side-nav { width: 250px; background: #f1f8f1; padding: 30px; border-right: 1px solid #eee; }
        .nav-link { padding: 12px 15px; margin-bottom: 10px; border-radius: 10px; cursor: pointer; color: #666; font-weight: 600; transition: 0.3s; display: flex; align-items: center; justify-content: space-between; }
        .nav-link.active { background: #2e7d32; color: white; }
        .badge { background: #ff5252; color: white; font-size: 0.7rem; padding: 2px 7px; border-radius: 10px; }
        .content { flex: 1; padding: 40px; }
        .notification-item { padding: 15px; border-radius: 12px; background: #f9f9f9; margin-bottom: 15px; border-left: 5px solid #2e7d32; }
      `}</style>

      <div className="profile-card">
        <div className="side-nav">
          <div className={`nav-link ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>👤 My Profile</div>
          <div className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            🔔 Notifications {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
          </div>
          <div className="nav-link" style={{color: '#d32f2f', marginTop: '50px'}} onClick={() => { localStorage.removeItem("user"); navigate("/login"); }}>🚪 Logout</div>
        </div>

        <div className="content">
          {activeTab === 'general' ? (
            <>
              <h2 style={{marginTop: 0, color: '#2e7d32'}}>Account Settings</h2>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '5px'}}>FULL NAME</label>
                <input style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd'}} value={user.name || ""} onChange={e => setUser({...user, name: e.target.value})} />
              </div>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '5px'}}>EMAIL</label>
                <input style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd'}} value={user.email || ""} readOnly />
              </div>
              <button onClick={handleSave} style={{background: '#2e7d32', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'}}>Save Changes</button>
            </>
          ) : (
            <>
              <h2 style={{marginTop: 0, color: '#2e7d32'}}>Your Activity</h2>
              {notifications.map(n => (
                <div key={n.id} className="notification-item">
                  <p style={{margin: '0 0 5px 0', fontWeight: '600'}}>{n.text}</p>
                  <span style={{fontSize: '0.75rem', color: '#999'}}>{n.date}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;