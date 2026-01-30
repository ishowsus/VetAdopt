import { useState, useMemo, useEffect } from "react";
import { db, auth } from "../Firebase"; 
import { collection, addDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, updateProfile } from "firebase/auth";

const PET_DATA = [
  { id: 1, name: "Buddy", type: "Dog", gender: "Male", age: "2 years", description: "Friendly and playful labrador mix.", image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600", badge: "New" },
  { id: 2, name: "Luna", type: "Dog", gender: "Female", age: "1 year", description: "Gentle, loving, and great with kids.", image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=600", badge: "Puppy" },
  { id: 3, name: "Milo", type: "Cat", gender: "Male", age: "3 years", description: "A calm indoor cat who loves naps.", image: "https://images.unsplash.com/photo-1514888286872-01d6d89f4c2e?auto=format&fit=crop&q=80&w=600", badge: "" },
  { id: 4, name: "Daisy", type: "Dog", gender: "Female", age: "4 months", description: "High energy puppy ready for training.", image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600", badge: "Puppy" },
  { id: 5, name: "Coco", type: "Cat", gender: "Female", age: "2 years", description: "Curious, affectionate, and talkative.", image: "https://images.unsplash.com/photo-1573865662567-57ef8424bd54?auto=format&fit=crop&q=80&w=600", badge: "New" },
  { id: 6, name: "Max", type: "Rabbit", gender: "Male", age: "1 year", description: "Soft, gentle, and loves carrots.", image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=600", badge: "" },
  { id: 7, name: "Bella", type: "Dog", gender: "Female", age: "3 years", description: "Loyal, protective, and very smart.", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=600", badge: "" },
  { id: 8, name: "Charlie", type: "Parrot", gender: "Male", age: "2 years", description: "Talkative parrot with vibrant feathers.", image: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&q=80&w=600", badge: "New" },
];

function Adopt() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedPet, setSelectedPet] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  
  // Auth & Form State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalStep, setModalStep] = useState("login");
  const [authData, setAuthData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [contactData, setContactData] = useState({ phone: "", notes: "" });
  const [loading, setLoading] = useState(false);

  // Sync with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const filteredPets = useMemo(() => {
    return PET_DATA.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.type.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || p.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".pet-card").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [filteredPets]);

  const openAdopt = (pet) => {
    setSelectedPet(pet);
    setModalStep(isLoggedIn ? "adopt" : "login");
  };

  const closeModal = () => {
    setSelectedPet(null);
    setContactData({ phone: "", notes: "" });
  };

  const handleAuth = async (type) => {
    if (!authData.email || !authData.password) return alert("Please fill in fields");
    setLoading(true);
    try {
      if (type === 'register') {
        const res = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
        await updateProfile(res.user, { displayName: authData.name });
      } else {
        await signInWithEmailAndPassword(auth, authData.email, authData.password);
      }
      setModalStep("adopt");
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const handleApplicationSubmit = async () => {
    if (!contactData.phone) return alert("Please enter a phone number");
    setLoading(true);
    try {
      await addDoc(collection(db, "applications"), {
        petName: selectedPet.name,
        phone: contactData.phone,
        notes: contactData.notes,
        email: auth.currentUser.email,
        createdAt: new Date()
      });
      setModalStep('success');
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div className="adopt-page">
      <style>{`
        .adopt-page { font-family: 'Inter', sans-serif; background: #f8faf8; min-height: 100vh; color: #333; }
        .hero { 
          background: linear-gradient(rgba(5, 102, 11, 0.8), rgba(147, 240, 26, 0.8)), 
                      url('https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&q=80&w=1200');
          background-size: cover; background-position: center;
          color: white; padding: 120px 20px; text-align: center; 
          clip-path: ellipse(150% 100% at 50% 0%);
        }
        .controls-container { max-width: 900px; margin: -50px auto 50px; padding: 30px; background: white; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); z-index: 10; position: relative; }
        .search-box { width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 12px; font-size: 1.1rem; margin-bottom: 20px; outline-color: #2e7d32; transition: 0.3s; box-sizing: border-box; }
        .filter-chips { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .chip { padding: 10px 22px; border-radius: 30px; border: 2px solid #e8f5e9; background: white; color: #2e7d32; cursor: pointer; font-weight: 600; transition: 0.3s; }
        .chip.active { background: #2e7d32; color: white; border-color: #2e7d32; transform: scale(1.05); }
        .pet-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .pet-card { background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); opacity: 0; transform: translateY(40px); }
        .pet-card.visible { opacity: 1; transform: translateY(0); }
        .pet-card:hover { transform: translateY(-12px) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.12); }
        .img-container { position: relative; height: 240px; overflow: hidden; cursor: zoom-in; }
        .pet-card img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
        .pet-card:hover img { transform: scale(1.08); }
        .zoom-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; animation: fadeIn 0.3s; }
        .zoom-img { max-width: 90%; max-height: 80vh; border-radius: 12px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .badge { position: absolute; top: 15px; left: 15px; background: #ffb300; padding: 6px 14px; border-radius: 12px; font-weight: bold; font-size: 0.8rem; z-index: 2; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
        .modal { background: white; width: 90%; max-width: 440px; border-radius: 30px; padding: 40px; position: relative; animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes modalPop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .btn-adopt { width: 100%; padding: 16px; background: #2e7d32; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 20px; font-size: 1rem; transition: 0.3s; }
        .btn-adopt:disabled { background: #ccc; }
      `}</style>

      <section className="hero">
        <h1>Find Your Forever Friend 🐾</h1>
        <p>Browse rescued animals waiting for a loving home.</p>
      </section>

      <div className="controls-container">
        <input className="search-box" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="filter-chips">
          {["All", "Dog", "Cat", "Rabbit", "Parrot"].map(cat => (
            <button key={cat} className={`chip ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{cat}s</button>
          ))}
        </div>
      </div>

      <div className="pet-grid">
        {filteredPets.map((pet, index) => (
          <div className="pet-card" key={pet.id} style={{ transitionDelay: `${(index % 4) * 0.1}s` }}>
            <div className="img-container" onClick={() => setZoomImage(pet.image)}>
              <img src={pet.image} alt={pet.name} onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=Image+Coming+Soon"; }} />
              {pet.badge && <span className="badge">{pet.badge}</span>}
            </div>
            <div style={{padding: '25px', textAlign: 'center'}}>
              <h3 style={{margin: '0 0 5px', color: '#1b5e20', fontSize: '1.5rem'}}>{pet.name}</h3>
              <p style={{color: '#777', fontSize: '0.9rem', marginBottom: '15px'}}>{pet.type} • {pet.gender} • {pet.age}</p>
              <button className="btn-adopt" onClick={() => openAdopt(pet)}>Adopt Me</button>
            </div>
          </div>
        ))}
      </div>

      {zoomImage && (
        <div className="zoom-overlay" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="zoom-img" alt="Zoom" />
        </div>
      )}

      {selectedPet && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} style={{position:'absolute', top:25, right:25, background:'none', border:'none', fontSize:22, cursor:'pointer', color: '#ccc'}}>✕</button>
            
            {!isLoggedIn && modalStep === "login" && (
              <>
                <h2>Login to Adopt</h2>
                <input type="email" placeholder="Email" className="search-box" onChange={e => setAuthData({...authData, email: e.target.value})} />
                <input type="password" placeholder="Password" className="search-box" onChange={e => setAuthData({...authData, password: e.target.value})} />
                <button className="btn-adopt" onClick={() => handleAuth('login')} disabled={loading}>{loading ? "Checking..." : "Login"}</button>
                <p style={{textAlign:'center', fontSize:'0.9rem', marginTop:15}}>New? <span onClick={()=>setModalStep('register')} style={{color:'#2e7d32', cursor:'pointer', fontWeight:'bold'}}>Sign Up</span></p>
              </>
            )}

            {!isLoggedIn && modalStep === "register" && (
              <>
                <h2>Create Account</h2>
                <input type="text" placeholder="Full Name" className="search-box" onChange={e => setAuthData({...authData, name: e.target.value})} />
                <input type="email" placeholder="Email" className="search-box" onChange={e => setAuthData({...authData, email: e.target.value})} />
                <input type="password" placeholder="Password" className="search-box" onChange={e => setAuthData({...authData, password: e.target.value})} />
                <button className="btn-adopt" onClick={() => handleAuth('register')} disabled={loading}>Register</button>
                <p style={{textAlign:'center', fontSize:'0.9rem', marginTop:15}}>Have account? <span onClick={()=>setModalStep('login')} style={{color:'#2e7d32', cursor:'pointer', fontWeight:'bold'}}>Login</span></p>
              </>
            )}

            {modalStep === "adopt" && (
              <>
                <h2>Adopt {selectedPet.name}</h2>
                <input type="tel" placeholder="Phone Number" className="search-box" value={contactData.phone} onChange={e => setContactData({...contactData, phone: e.target.value})} />
                <textarea className="search-box" rows="4" placeholder="Tell us about your home..." value={contactData.notes} onChange={e => setContactData({...contactData, notes: e.target.value})}></textarea>
                <button className="btn-adopt" onClick={handleApplicationSubmit} disabled={loading}>{loading ? "Sending..." : "Submit Application"}</button>
              </>
            )}

            {modalStep === "success" && (
              <div style={{textAlign:'center'}}>
                <div style={{fontSize: '5rem'}}>🎉</div>
                <h2>Application Sent!</h2>
                <button className="btn-adopt" onClick={closeModal}>Back to Pets</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Adopt;