import { useState } from "react";

// Expanded pet data (8 pets)
const pets = [
  { id: 1, name: "Buddy", type: "Dog", gender: "Male", age: "2 years", description: "Friendly and playful", image: "https://placedog.net/400/300?id=1", badge: "New" },
  { id: 2, name: "Luna", type: "Dog", gender: "Female", age: "1 year", description: "Gentle and loving", image: "https://placedog.net/400/300?id=2", badge: "Puppy" },
  { id: 3, name: "Milo", type: "Cat", gender: "Male", age: "3 years", description: "Calm indoor cat", image: "https://placekitten.com/400/300", badge: "" },
  { id: 4, name: "Daisy", type: "Dog", gender: "Female", age: "4 months", description: "Energetic puppy", image: "https://placedog.net/400/300?id=3", badge: "Puppy" },
  { id: 5, name: "Coco", type: "Cat", gender: "Female", age: "2 years", description: "Curious and affectionate", image: "https://placekitten.com/401/300", badge: "New" },
  { id: 6, name: "Max", type: "Rabbit", gender: "Male", age: "1 year", description: "Soft and gentle", image: "https://images.unsplash.com/photo-1601758123927-4a3ff7a5f507?crop=entropy&cs=tinysrgb&fit=max&h=300&w=400", badge: "" },
  { id: 7, name: "Bella", type: "Dog", gender: "Female", age: "3 years", description: "Loyal and protective", image: "https://placedog.net/400/300?id=4", badge: "" },
  { id: 8, name: "Charlie", type: "Parrot", gender: "Male", age: "2 years", description: "Talkative and colorful", image: "https://images.unsplash.com/photo-1574169208507-843761748ecf?crop=entropy&cs=tinysrgb&fit=max&h=300&w=400", badge: "New" },
];

function Adopt() {
  const [search, setSearch] = useState("");
  const [selectedPet, setSelectedPet] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalStep, setModalStep] = useState("login"); // login / adopt / success
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [authData, setAuthData] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  // Filter pets by search
  const filteredPets = pets.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.type.toLowerCase().includes(search.toLowerCase())
  );

  const openAdopt = (pet) => {
    setSelectedPet(pet);
    setModalStep(isLoggedIn ? "adopt" : "login");
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const closeModal = () => {
    setSelectedPet(null);
    setModalStep("login");
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    setModalStep("success");
  };

  const handleAuthChange = (e) => setAuthData({ ...authData, [e.target.name]: e.target.value });
  const handleLogin = () => {
    if (!authData.email || !authData.password) return alert("Please fill in all fields");
    setIsLoggedIn(true);
    setModalStep("adopt");
    setFormData({ name: authData.name || "", email: authData.email, phone: "", message: "" });
  };
  const handleRegister = () => {
    if (!authData.name || !authData.email || !authData.password || !authData.confirmPassword)
      return alert("Please fill in all fields");
    if (authData.password !== authData.confirmPassword) return alert("Passwords do not match!");
    setIsLoggedIn(true);
    setModalStep("adopt");
    setFormData({ name: authData.name, email: authData.email, phone: "", message: "" });
  };

  return (
    <>
      <style>{`
        body { font-family: Arial, sans-serif; margin:0; padding:0; }
        /* HERO */
        .adopt-hero { background: linear-gradient(rgba(46,125,50,0.7), rgba(46,125,50,0.7)), url('https://images.unsplash.com/photo-1560807707-8cc77767d783') center/cover no-repeat; color:white; padding:120px 20px; text-align:center; }
        .adopt-hero h1{ font-size:3.5rem; margin-bottom:15px; }
        .adopt-hero p{ font-size:1.25rem; max-width:700px; margin:0 auto 20px; }
        .adopt-hero button{ padding:14px 30px; font-size:1.1rem; background:#ffb300; border:none; border-radius:30px; font-weight:bold; cursor:pointer; color:#2e7d32; transition:transform 0.3s, background 0.3s; }
        .adopt-hero button:hover{ transform:scale(1.05); background:#ffc107; }

        /* SEARCH */
        .search-bar{ max-width:600px; margin:20px auto; display:flex; justify-content:center; }
        .search-bar input{ flex:1; padding:10px 15px; font-size:1rem; border-radius:10px; border:1px solid #ccc; }

        /* PET GRID */
        .adopt-section{ max-width:1200px; margin:60px auto; padding:0 20px; }
        .pet-grid{ display:grid; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); gap:25px; }
        .pet-card{ background:white; border-radius:15px; overflow:hidden; box-shadow:0 6px 15px rgba(0,0,0,0.1); transition:transform 0.3s, box-shadow 0.3s; position:relative; }
        .pet-card:hover{ transform:translateY(-6px) scale(1.02); box-shadow:0 10px 20px rgba(0,0,0,0.2); }
        .pet-image{ height:200px; display:flex; align-items:center; justify-content:center; font-size:4rem; overflow:hidden; }
        .pet-image img{ width:100%; height:100%; object-fit:cover; transition: transform 0.3s; }
        .pet-card:hover .pet-image img{ transform: scale(1.1); }
        .badge{ position:absolute; top:10px; left:10px; background:#ffb300; color:#2e7d32; padding:5px 10px; border-radius:12px; font-weight:bold; font-size:0.9rem; }
        .pet-info{ padding:20px; text-align:center; }
        .pet-info h3{ margin:0;color:#1b5e20;font-size:1.4rem; }
        .pet-info p{ font-size:0.95rem; color:#555; margin:5px 0; }
        .pet-info button{ margin-top:10px; padding:12px 26px; background:#2e7d32;color:white;border:none;border-radius:25px;font-weight:bold;cursor:pointer;transition: transform 0.3s, background 0.3s; }
        .pet-info button:hover{ background:#1b5e20; transform:scale(1.05); }

        /* MODAL */
        .modal-overlay{ position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center; z-index:999; }
        .modal{ background:white; border-radius:15px; padding:30px; max-width:400px; width:90%; text-align:center; }
        .modal h3{ color:#1b5e20; font-size:1.8rem; margin-bottom:15px; }
        .modal input,.modal textarea{ margin-bottom:12px; padding:10px; border-radius:8px; border:1px solid #ccc; width:100%; font-size:1rem; }
        .modal textarea{ resize:vertical; }
        .modal button{ margin-top:10px; padding:12px 28px; background:#2e7d32; color:white; border:none; border-radius:25px; font-weight:bold; cursor:pointer; transition: transform 0.3s, background 0.3s; }
        .modal button:hover{ background:#1b5e20; transform:scale(1.05); }
        .modal-tab{ display:flex; justify-content:space-around; margin-bottom:15px; }
        .modal-tab button{ flex:1; padding:10px; margin:0 5px; border:1px solid #2e7d32; border-radius:20px; background:white; color:#2e7d32; cursor:pointer; font-weight:bold; transition:0.3s; }
        .modal-tab button.active{ background:#2e7d32; color:white; }
        @media(max-width:768px){ .adopt-hero h1{font-size:2.5rem;} .adopt-hero p{font-size:1.1rem;} }
      `}</style>

      {/* HERO */}
      <section className="adopt-hero">
        <h1>Adopt a Pet 🐶🐱</h1>
        <p>Give love, get love! Explore our furry friends looking for a forever home.</p>
        <button onClick={() => document.getElementById("pet-grid").scrollIntoView({ behavior: "smooth" })}>Browse Pets</button>
      </section>

      {/* SEARCH */}
      <div className="search-bar">
        <input type="text" placeholder="Search pets by name or type..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* PET GRID */}
      <section className="adopt-section" id="pet-grid">
        <div className="pet-grid">
          {filteredPets.map(pet => (
            <div className="pet-card" key={pet.id}>
              <div className="pet-image">
                <img src={pet.image} alt={pet.name} />
                {pet.badge && <span className="badge">{pet.badge}</span>}
              </div>
              <div className="pet-info">
                <h3>{pet.name}</h3>
                <p>{pet.gender} • {pet.age}</p>
                <p>{pet.description}</p>
                <button onClick={() => openAdopt(pet)}>Adopt Me</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL */}
      {selectedPet && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* STEP 1: LOGIN/REGISTER */}
            {!isLoggedIn && modalStep === "login" && (
              <>
                <div className="modal-tab">
                  <button className="active">Login</button>
                  <button onClick={() => setModalStep("register")}>Register</button>
                </div>
                <h3>Login to Adopt</h3>
                <input type="email" name="email" placeholder="Email" value={authData.email} onChange={handleAuthChange} />
                <input type="password" name="password" placeholder="Password" value={authData.password} onChange={handleAuthChange} />
                <button onClick={handleLogin}>Login</button>
              </>
            )}
            {!isLoggedIn && modalStep === "register" && (
              <>
                <div className="modal-tab">
                  <button onClick={() => setModalStep("login")}>Login</button>
                  <button className="active">Register</button>
                </div>
                <h3>Register to Adopt</h3>
                <input type="text" name="name" placeholder="Full Name" value={authData.name} onChange={handleAuthChange} />
                <input type="email" name="email" placeholder="Email" value={authData.email} onChange={handleAuthChange} />
                <input type="password" name="password" placeholder="Password" value={authData.password} onChange={handleAuthChange} />
                <input type="password" name="confirmPassword" placeholder="Confirm Password" value={authData.confirmPassword} onChange={handleAuthChange} />
                <button onClick={handleRegister}>Register</button>
              </>
            )}

            {/* STEP 2: ADOPTION FORM */}
            {isLoggedIn && modalStep === "adopt" && (
              <>
                <h3>Adopt {selectedPet.name}</h3>
                <form onSubmit={handleSubmit}>
                  <input type="text" name="name" placeholder="Your Name" value={formData.name} onChange={handleChange} required />
                  <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                  <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} />
                  <textarea name="message" placeholder="Message (optional)" value={formData.message} onChange={handleChange}></textarea>
                  <button type="submit">Submit Adoption Request</button>
                </form>
              </>
            )}

            {/* STEP 3: SUCCESS */}
            {modalStep === "success" && (
              <>
                <h3>Success! 🎉</h3>
                <p>Your adoption request for {selectedPet.name} has been submitted.</p>
                <button onClick={closeModal}>Close</button>
              </>
            )}

            <button onClick={closeModal} style={{ marginTop: "10px", background: "#ccc", color: "#333" }}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

export default Adopt;
