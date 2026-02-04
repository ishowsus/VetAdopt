import { useState, useEffect } from "react";

// 1. DATA OUTSIDE COMPONENT
// Prevents the arrays from being re-initialized on every render
const PETS = [
  { id: 1, name: "Max 🐶", desc: "Friendly 2-year-old Labrador.", img: "https://placedog.net/400/300?id=1" },
  { id: 2, name: "Bella 🐶", desc: "Playful 1-year-old Beagle.", img: "https://placedog.net/400/300?id=2" },
  { id: 3, name: "Charlie 🐶", desc: "Loving 3-year-old mixed breed.", img: "https://placedog.net/400/300?id=3" },
  { id: 4, name: "Luna 🐶", desc: "Curious 2-year-old Terrier.", img: "https://placedog.net/400/300?id=4" },
];

const TESTIMONIALS = [
  { id: 1, img: "https://randomuser.me/api/portraits/women/68.jpg", text: '"Thanks to VetAdopt, Bella found her forever home!"' },
  { id: 2, img: "https://randomuser.me/api/portraits/men/72.jpg", text: '"The adoption process was smooth and caring. Highly recommend!"' },
  { id: 3, img: "https://randomuser.me/api/portraits/women/65.jpg", text: '"VetAdopt helped me give Max the loving home he deserved!"' },
];

function Home() {
  const [currentPet, setCurrentPet] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Auto-slide logic using functional updates to stay in sync
  useEffect(() => {
    const petInterval = setInterval(() => {
      setCurrentPet(prev => (prev + 1) % PETS.length);
    }, 4500);
    const testInterval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    
    return () => {
      clearInterval(petInterval);
      clearInterval(testInterval);
    };
  }, []);

  return (
    <div className="home-container">
      <style>{`
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin:0; color: #333; }
        
        /* HERO */
        .hero { 
          height: 80vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), 
                      url("https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1500") center/cover;
          color: white; 
          text-align: center;
          padding: 0 20px;
        }
        .hero h1 { font-size: clamp(2.5rem, 8vw, 4.5rem); margin: 0; }
        .hero button { 
          padding: 15px 40px; 
          background: #ffc107; 
          color: #55420f; 
          border: none; 
          border-radius: 50px; 
          font-weight: bold; 
          font-size: 1.1rem; 
          cursor: pointer;
          transition: 0.3s;
        }
        .hero button:hover { transform: scale(1.05); background: #ffca2c; }

        /* RESPONSIVE PET CAROUSEL */
        .carousel-section { max-width: 1200px; margin: 80px auto; overflow: hidden; position: relative; padding: 0 40px; }
        .carousel-track { 
          display: flex; 
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); 
          /* Moves the track by exactly one item width */
          transform: translateX(-${currentPet * 100}%); 
        }
        .carousel-item { min-width: 100%; box-sizing: border-box; padding: 10px; }
        .pet-card-large { 
          display: flex; 
          background: white; 
          border-radius: 20px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          overflow: hidden;
          flex-direction: column;
        }
        .pet-card-large img { width: 100%; height: 350px; object-fit: cover; }
        .pet-details { padding: 30px; text-align: center; }

        /* TESTIMONIALS - Modernized */
        .testimonials { background: #e8f5e9; padding: 100px 20px; text-align: center; }
        .testimonial-container { max-width: 600px; margin: 0 auto; min-height: 200px; }
        .test-img { width: 90px; height: 90px; border-radius: 50%; border: 4px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        
        /* SHARED BUTTONS */
        .nav-btn {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: white; border-radius: 50%; width: 45px; height: 45px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer; z-index: 10;
        }
        .prev-btn { left: 10px; }
        .next-btn { right: 10px; }

        @media (min-width: 768px) {
          .pet-card-large { flex-direction: row; }
          .pet-card-large img { width: 50%; height: auto; }
          .pet-details { width: 50%; display: flex; flex-direction: column; justify-content: center; }
        }
      `}</style>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1>Give Every Pet a <br/> Loving Home 🐾</h1>
          <p style={{fontSize: '1.2rem', marginBottom: '30px'}}>Over 5,000 animals found their family this year.</p>
          <button>Adopt a Friend</button>
        </div>
      </section>

      {/* PET CAROUSEL */}
      <section className="carousel-section">
        <h2 style={{textAlign: 'center', color: '#55420f', marginBottom: '40px'}}>Meet Our Featured Residents</h2>
        <div className="nav-btn prev-btn" onClick={() => setCurrentPet(p => (p === 0 ? PETS.length - 1 : p - 1))}>←</div>
        <div className="carousel-track">
          {PETS.map(pet => (
            <div key={pet.id} className="carousel-item">
              <div className="pet-card-large">
                <img src={pet.img} alt={pet.name} />
                <div className="pet-details">
                  <h3 style={{fontSize: '2rem', color: '#55420f', margin: '0 0 10px'}}>{pet.name}</h3>
                  <p style={{fontSize: '1.1rem', color: '#666'}}>{pet.desc}</p>
                  <button style={{marginTop: '20px', padding: '12px 25px', background: '#2e7d32', color: 'white', borderRadius: '8px', cursor:'pointer', border:'none'}}>Learn More</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="nav-btn next-btn" onClick={() => setCurrentPet(p => (p + 1) % PETS.length)}>→</div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="testimonial-container">
          <img className="test-img" src={TESTIMONIALS[currentTestimonial].img} alt="User" />
          <p style={{fontSize: '1.4rem', fontStyle: 'italic', margin: '25px 0'}}>{TESTIMONIALS[currentTestimonial].text}</p>
          <div style={{display:'flex', justifyContent:'center', gap: '8px'}}>
            {TESTIMONIALS.map((_, i) => (
              <div 
                key={i} 
                onClick={() => setCurrentTestimonial(i)}
                style={{
                  width: '12px', height: '12px', borderRadius: '50%', 
                  background: currentTestimonial === i ? '#2e7d32' : '#c8e6c9',
                  cursor: 'pointer', transition: '0.3s'
                }}
              />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;