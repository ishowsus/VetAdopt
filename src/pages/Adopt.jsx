import { useState, useMemo, useEffect } from "react";

const PET_DATA = [
  { id: 1, name: "Buddy", type: "Dog", gender: "Male", age: "2 years", description: "Friendly and playful labrador mix.", image: "https://placedog.net/400/300?id=1", badge: "New" },
  { id: 2, name: "Luna", type: "Dog", gender: "Female", age: "1 year", description: "Gentle, loving, and great with kids.", image: "https://placedog.net/400/300?id=2", badge: "Puppy" },
  { id: 3, name: "Milo", type: "Cat", gender: "Male", age: "3 years", description: "A calm indoor cat who loves naps.", image: "https://placekitten.com/400/300", badge: "" },
  { id: 4, name: "Daisy", type: "Dog", gender: "Female", age: "4 months", description: "High energy puppy ready for training.", image: "https://placedog.net/400/300?id=3", badge: "Puppy" },
  { id: 5, name: "Coco", type: "Cat", gender: "Female", age: "2 years", description: "Curious, affectionate, and talkative.", image: "https://placekitten.com/401/300", badge: "New" },
  { id: 6, name: "Max", type: "Rabbit", gender: "Male", age: "1 year", description: "Soft, gentle, and loves carrots.", image: "https://images.unsplash.com/photo-1601758123927-4a3ff7a5f507?auto=format&fit=crop&q=80&w=400", badge: "" },
  { id: 7, name: "Bella", type: "Dog", gender: "Female", age: "3 years", description: "Loyal, protective, and very smart.", image: "https://placedog.net/400/300?id=4", badge: "" },
  { id: 8, name: "Charlie", type: "Parrot", gender: "Male", age: "2 years", description: "Talkative parrot with vibrant feathers.", image: "https://images.unsplash.com/photo-1574169208507-843761748ecf?auto=format&fit=crop&q=80&w=400", badge: "New" },
];

function Adopt() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedPet, setSelectedPet] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalStep, setModalStep] = useState("login");
  const [authData, setAuthData] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  // 1. FILTER LOGIC
  const filteredPets = useMemo(() => {
    return PET_DATA.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.type.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || p.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  // 2. SCROLL ANIMATION LOGIC (Staggered Entrance)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll(".pet-card");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [filteredPets]); // Re-run observer when filter changes

  const openAdopt = (pet) => {
    setSelectedPet(pet);
    setModalStep(isLoggedIn ? "adopt" : "login");
  };

  const closeModal = () => {
    setSelectedPet(null);
    setModalStep("login");
  };

  const handleAuth = (type) => {
    if (!authData.email || !authData.password) return alert("Please fill in fields");
    if (type === 'register' && authData.password !== authData.confirmPassword) return alert("Passwords mismatch");
    setIsLoggedIn(true);
    setModalStep("adopt");
  };

  return (
    <div className="adopt-page">
      <style>{`
        .adopt-page { font-family: 'Inter', sans-serif; background: #f8faf8; min-height: 100vh; color: #333; }
        
        /* HERO WITH MODERN CURVE */
        .hero { 
          background: linear-gradient(rgba(27, 94, 32, 0.8), rgba(27, 94, 32, 0.8)), 
                      url('https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&q=80&w=1200');
          background-size: cover; background-position: center;
          color: white; padding: 120px 20px; text-align: center; 
          clip-path: ellipse(150% 100% at 50% 0%);
        }
        .hero h1 { font-size: clamp(2.5rem, 6vw, 4rem); margin: 0; }
        
        /* SEARCH & FILTER CONTROLS */
        .controls-container { max-width: 900px; margin: -50px auto 50px; padding: 30px; background: white; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); z-index: 10; position: relative; }
        .search-box { width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 12px; font-size: 1.1rem; margin-bottom: 20px; outline-color: #2e7d32; transition: 0.3s; }
        .search-box:focus { border-color: #2e7d32; box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.1); }
        .filter-chips { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .chip { padding: 10px 22px; border-radius: 30px; border: 2px solid #e8f5e9; background: white; color: #2e7d32; cursor: pointer; font-weight: 600; transition: 0.3s; }
        .chip.active { background: #2e7d32; color: white; border-color: #2e7d32; transform: scale(1.05); }

        /* PET GRID & ANIMATION */
        .pet-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .pet-card { 
          background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0; transform: translateY(40px); /* Hidden State */
        }
        .pet-card.visible { opacity: 1; transform: translateY(0); } /* Visible State */
        .pet-card:hover { transform: translateY(-12px) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.12); }
        .pet-card img { width: 100%; height: 240px; object-fit: cover; transition: 0.5s; }
        .pet-card:hover img { transform: scale(1.08); }
        
        .badge { position: absolute; top: 15px; left: 15px; background: #ffb300; padding: 6px 14px; border-radius: 12px; font-weight: bold; font-size: 0.8rem; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
        .modal { background: white; width: 90%; max-width: 440px; border-radius: 30px; padding: 40px; position: relative; animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes modalPop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .modal input { width: 100%; padding: 14px; margin: 10px 0; border: 2px solid #f0f0f0; border-radius: 12px; box-sizing: border-box; font-size: 1rem; }
        .btn-adopt { width: 100%; padding: 16px; background: #2e7d32; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 20px; font-size: 1rem; transition: 0.3s; }
        .btn-adopt:hover { background: #1b5e20; transform: translateY(-2px); }
      `}</style>

      {/* HERO */}
      <section className="hero">
        <h1>Find Your Forever Friend 🐾</h1>
        <p>Browse rescued animals waiting for a loving home.</p>
      </section>

      {/* CONTROLS */}
      <div className="controls-container">
        <input 
          className="search-box" 
          placeholder="Search by name, type, or breed..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
        <div className="filter-chips">
          {["All", "Dog", "Cat", "Rabbit", "Parrot"].map(cat => (
            <button 
              key={cat} 
              className={`chip ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}s
            </button>
          ))}
        </div>
      </div>

      {/* PET GRID */}
      <div className="pet-grid">
        {filteredPets.length > 0 ? filteredPets.map((pet, index) => (
          <div 
            className="pet-card" 
            key={pet.id}
            style={{ transitionDelay: `${(index % 4) * 0.1}s` }} // STAGGERED EFFECT
          >
            <div style={{position: 'relative', overflow: 'hidden'}}>
              <img src={pet.image} alt={pet.name} />
              {pet.badge && <span className="badge">{pet.badge}</span>}
            </div>
            <div style={{padding: '25px', textAlign: 'center'}}>
              <h3 style={{margin: '0 0 5px', color: '#1b5e20', fontSize: '1.5rem'}}>{pet.name}</h3>
              <p style={{color: '#777', fontSize: '0.9rem', marginBottom: '15px'}}>{pet.type} • {pet.gender} • {pet.age}</p>
              <button className="btn-adopt" onClick={() => openAdopt(pet)}>Adopt Me</button>
            </div>
          </div>
        )) : (
          <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '100px 0'}}>
            <p style={{fontSize: '1.2rem', color: '#999'}}>We couldn't find any pets matching your search.</p>
          </div>
        )}
      </div>

      {/* MODAL SYSTEM */}
      {selectedPet && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} style={{position:'absolute', top:25, right:25, background:'none', border:'none', fontSize:22, cursor:'pointer', color: '#ccc'}}>✕</button>
            
            {modalStep === "login" && (
              <>
                <h2 style={{marginTop: 0}}>Login to Adopt</h2>
                <p>You need an account to apply for {selectedPet.name}.</p>
                <input type="email" placeholder="Email" onChange={e => setAuthData({...authData, email: e.target.value})} />
                <input type="password" placeholder="Password" onChange={e => setAuthData({...authData, password: e.target.value})} />
                <button className="btn-adopt" onClick={() => handleAuth('login')}>Login</button>
                <p style={{fontSize:'0.9rem', marginTop:20}}>New here? <span onClick={() => setModalStep('register')} style={{color:'#2e7d32', cursor:'pointer', fontWeight:'bold'}}>Create account</span></p>
              </>
            )}

            {modalStep === "register" && (
              <>
                <h2 style={{marginTop: 0}}>Create Account</h2>
                <input type="text" placeholder="Full Name" onChange={e => setAuthData({...authData, name: e.target.value})} />
                <input type="email" placeholder="Email" onChange={e => setAuthData({...authData, email: e.target.value})} />
                <input type="password" placeholder="Password" onChange={e => setAuthData({...authData, password: e.target.value})} />
                <input type="password" placeholder="Confirm Password" onChange={e => setAuthData({...authData, confirmPassword: e.target.value})} />
                <button className="btn-adopt" onClick={() => handleAuth('register')}>Register</button>
                <p style={{fontSize:'0.9rem', marginTop:20}}>Have an account? <span onClick={() => setModalStep('login')} style={{color:'#2e7d32', cursor:'pointer', fontWeight:'bold'}}>Login</span></p>
              </>
            )}

            {modalStep === "adopt" && (
              <>
                <h2 style={{marginTop: 0}}>Adopt {selectedPet.name}</h2>
                <p>Provide your contact details so we can reach out.</p>
                <input type="tel" placeholder="Phone Number" />
                <textarea style={{width:'100%', borderRadius:12, border:'2px solid #f0f0f0', padding:14, margin:'10px 0', boxSizing:'border-box', fontFamily:'inherit'}} rows="4" placeholder="Tell us about your home..."></textarea>
                <button className="btn-adopt" onClick={() => setModalStep('success')}>Submit Application</button>
              </>
            )}

            {modalStep === "success" && (
              <div style={{textAlign:'center'}}>
                <div style={{fontSize: '5rem', marginBottom: 10}}>🎉</div>
                <h2 style={{marginTop: 0}}>Application Sent!</h2>
                <p>We'll review your application for {selectedPet.name} and get back to you within 48 hours.</p>
                <button className="btn-adopt" onClick={closeModal}>Got it!</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Adopt;