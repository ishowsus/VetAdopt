import { useState, useEffect, useRef } from "react";

function Home() {
  // Featured pets
  const pets = [
    { id: 1, name: "Max 🐶", desc: "Friendly 2-year-old Labrador.", img: "https://placedog.net/300/200?id=1" },
    { id: 2, name: "Bella 🐶", desc: "Playful 1-year-old Beagle.", img: "https://placedog.net/300/200?id=2" },
    { id: 3, name: "Charlie 🐶", desc: "Loving 3-year-old mixed breed.", img: "https://placedog.net/300/200?id=3" },
    { id: 4, name: "Luna 🐶", desc: "Curious 2-year-old Terrier.", img: "https://placedog.net/300/200?id=4" },
  ];

  const testimonials = [
    { id: 1, img: "https://randomuser.me/api/portraits/women/68.jpg", text: '"Thanks to VetAdopt, Bella found her forever home!"' },
    { id: 2, img: "https://randomuser.me/api/portraits/men/72.jpg", text: '"The adoption process was smooth and caring. Highly recommend!"' },
    { id: 3, img: "https://randomuser.me/api/portraits/women/65.jpg", text: '"VetAdopt helped me give Max the loving home he deserved!"' },
  ];

  const [currentPet, setCurrentPet] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Auto-slide pets
  useEffect(() => {
    const petInterval = setInterval(() => {
      setCurrentPet(prev => (prev + 1) % pets.length);
    }, 3500); // every 3.5 seconds
    return () => clearInterval(petInterval);
  }, [pets.length]);

  // Auto-slide testimonials
  useEffect(() => {
    const testInterval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000); // every 4 seconds
    return () => clearInterval(testInterval);
  }, [testimonials.length]);

  const prevPet = () => setCurrentPet(prev => (prev === 0 ? pets.length - 1 : prev - 1));
  const nextPet = () => setCurrentPet(prev => (prev + 1) % pets.length);

  const prevTestimonial = () => setCurrentTestimonial(prev => (prev === 0 ? testimonials.length - 1 : prev - 1));
  const nextTestimonial = () => setCurrentTestimonial(prev => (prev + 1) % testimonials.length);

  return (
    <>
      <style>{`
        body { font-family: Arial, sans-serif; margin:0; padding:0; }
        button { cursor:pointer; border:none; font-family:inherit; }

        /* HERO */
        .hero { height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; color:white; position:relative; overflow:hidden; animation: heroZoom 30s infinite alternate; }
        .hero::before { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(46,125,50,0.6); backdrop-filter:blur(2px); }
        .hero-bg { position:absolute; top:0; left:0; width:100%; height:100%; background:url("https://images.unsplash.com/photo-1548199973-03cce0bbc87b") center/cover no-repeat; z-index:0; }
        .hero-content { position:relative; z-index:1; animation: fadeInUp 1s ease forwards; }
        .hero h1 { font-size:4rem; margin-bottom:20px; text-shadow:2px 2px 8px rgba(0,0,0,0.6); }
        .hero p { font-size:1.4rem; max-width:700px; margin:0 auto 30px; line-height:1.6; }
        .hero button { padding:16px 36px; font-size:1.2rem; border-radius:35px; background:linear-gradient(90deg,#ffb300,#ffc107); color:#2e7d32; font-weight:bold; transition:transform 0.3s,filter 0.3s; }
        .hero button:hover { transform:scale(1.05); filter:brightness(1.1); }

        /* CAROUSEL */
        .carousel { max-width:1000px; margin:50px auto; position:relative; display:flex; align-items:center; overflow:hidden; }
        .carousel-track { display:flex; transition: transform 0.5s ease-in-out; }
        .carousel-card { min-width:250px; margin:0 15px; background:white; border-radius:16px; box-shadow:0 8px 20px rgba(0,0,0,0.08); text-align:center; padding:20px; flex-shrink:0; }
        .carousel-card img { width:100%; border-radius:12px; }
        .carousel-card h3 { margin:15px 0 10px; color:#1b5e20; }
        .carousel-card p { color:#444; line-height:1.5; }
        .carousel-btn { position:absolute; top:50%; transform:translateY(-50%); background:#2e7d32; color:white; border-radius:50%; width:40px;height:40px; display:flex; justify-content:center; align-items:center; font-size:1.5rem; z-index:1; }
        .carousel-btn.prev { left:-20px; }
        .carousel-btn.next { right:-20px; }

        /* WHY VETADOPT */
        .section { max-width:1200px; margin:80px auto; padding:0 20px; }
        .section h2 { text-align:center; margin-bottom:50px; color:#2e7d32; font-size:2.2rem; }
        .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:30px; }
        .card { background:white; padding:30px; border-radius:16px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.08); transition: transform 0.4s, box-shadow 0.4s, background 0.3s; }
        .card:hover { transform:translateY(-8px); box-shadow:0 15px 30px rgba(0,0,0,0.15); background:#f1f8f2; }
        .card h3 { margin-top:15px; color:#1b5e20; font-size:1.3rem; }
        .card p { font-size:1rem; color:#444; line-height:1.5; }

        /* TESTIMONIALS */
        .testimonials { background:#f1f8f2; padding:80px 20px; border-radius:12px; margin:80px 0; text-align:center; display:flex; justify-content:center; align-items:center; position:relative; }
        .testimonial-card { background:white; padding:25px; border-radius:16px; box-shadow:0 8px 20px rgba(0,0,0,0.08); width:250px; text-align:center; transition: transform 0.5s; }
        .testimonial-card img { width:80px; height:80px; border-radius:50%; object-fit:cover; margin-bottom:15px; }
        .testimonial-card p { font-style:italic; color:#444; }

        /* CTA */
        .cta { background:#e8f5e9; padding:80px 20px; text-align:center; border-radius:12px; margin:80px 0; }
        .cta h2 { color:#2e7d32; font-size:2rem; margin-bottom:15px; }
        .cta p { font-size:1.1rem; color:#444; margin-bottom:25px; }
        .cta button { padding:14px 32px; background:#2e7d32; color:white; border-radius:30px; font-size:1.1rem; transition: transform 0.3s, background 0.3s; }
        .cta button:hover { transform:scale(1.05); background:#1b5e20; }

        /* HELP SECTION */
        .help-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:25px; margin-top:40px; }
        .help-card { background:white; padding:25px; border-radius:16px; text-align:center; box-shadow:0 8px 20px rgba(0,0,0,0.08); transition: transform 0.3s, box-shadow 0.3s; }
        .help-card:hover { transform:translateY(-5px); box-shadow:0 12px 25px rgba(0,0,0,0.12); }
        .help-card h3 { margin-top:10px; color:#1b5e20; }

        /* FOOTER */
        footer { background:#2e7d32; color:white; text-align:center; padding:40px 20px; }
        footer a { color:#ffc107; }
        footer p { margin:10px 0 0; }

        /* ANIMATIONS */
        @keyframes fadeInUp { from {opacity:0; transform:translateY(30px);} to {opacity:1; transform:translateY(0);} }
        @keyframes heroZoom { 0% {transform:scale(1);} 100% {transform:scale(1.1);} }

        @media(max-width:768px){ .hero h1{font-size:2.8rem;} .hero p{font-size:1.1rem;} .carousel-card{min-width:200px;} }
      `}</style>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1>Give Every Pet a Loving Home 🐾</h1>
          <p>Connecting rescued animals with caring families.</p>
          <button>Adopt Now</button>
        </div>
      </section>

      {/* PET CAROUSEL */}
      <section className="carousel">
        <button className="carousel-btn prev" onClick={prevPet}>&lt;</button>
        <div className="carousel-track" style={{ transform: `translateX(-${currentPet * 280}px)` }}>
          {pets.map(pet => (
            <div key={pet.id} className="carousel-card">
              <img src={pet.img} alt={pet.name} />
              <h3>{pet.name}</h3>
              <p>{pet.desc}</p>
            </div>
          ))}
        </div>
        <button className="carousel-btn next" onClick={nextPet}>&gt;</button>
      </section>

      {/* WHY VETADOPT */}
      <section className="section">
        <h2>Why Choose VetAdopt?</h2>
        <div className="cards">
          <div className="card"><h3>🐾 Responsible Adoption</h3><p>Every pet matched with a caring family.</p></div>
          <div className="card"><h3>🏥 Vet-Checked Pets</h3><p>All animals are healthy and ready for a new home.</p></div>
          <div className="card"><h3>💚 Support & Care</h3><p>Guidance after adoption for happy lives.</p></div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <button className="carousel-btn prev" onClick={prevTestimonial} style={{left:"45%"}}>&lt;</button>
        <div className="testimonial-card">
          <img src={testimonials[currentTestimonial].img} alt="User"/>
          <p>{testimonials[currentTestimonial].text}</p>
        </div>
        <button className="carousel-btn next" onClick={nextTestimonial} style={{right:"45%"}}>&gt;</button>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Make a Difference Today</h2>
        <p>Your support helps us rescue, care, and rehome animals.</p>
        <button>Donate Now</button>
      </section>

      {/* HELP */}
      <section className="section">
        <h2>How You Can Help</h2>
        <div className="help-cards">
          <div className="help-card"><h3>Adopt</h3><p>Give a loving home to a rescued pet.</p></div>
          <div className="help-card"><h3>Donate</h3><p>Support our mission to care for animals.</p></div>
          <div className="help-card"><h3>Volunteer</h3><p>Join our team and make a real impact.</p></div>
          <div className="help-card"><h3>Share</h3><p>Help raise awareness about animal adoption.</p></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <p>&copy; 2026 VetAdopt. All rights reserved.</p>
        <p>Follow us: <a href="#">Facebook</a> | <a href="#">Instagram</a> | <a href="#">TikTok</a></p>
      </footer>
    </>
  );
}

export default Home;
