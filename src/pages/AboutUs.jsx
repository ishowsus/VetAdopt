import { useEffect } from "react";

function About() {
  const team = [
    { id: 1, name: "Nadine Cruz", role: "Frontend Developer", img: "https://randomuser.me/api/portraits/women/68.jpg" },
    { id: 2, name: "Aaron Nash", role: "Backend Developer", img: "https://randomuser.me/api/portraits/men/72.jpg" },
    { id: 3, name: "Sophia Lee", role: "UI/UX Designer", img: "https://randomuser.me/api/portraits/women/65.jpg" },
    { id: 4, name: "Liam Kim", role: "Fullstack Developer", img: "https://randomuser.me/api/portraits/men/65.jpg" },
  ];

  useEffect(() => {
    // Simple scroll animation: add "visible" class when elements appear
    const animateOnScroll = () => {
      const elements = document.querySelectorAll('.fade-on-scroll');
      const windowBottom = window.innerHeight;
      elements.forEach(el => {
        const elementTop = el.getBoundingClientRect().top;
        if(elementTop < windowBottom - 50){
          el.classList.add('visible');
        }
      });
    };
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll();
    return () => window.removeEventListener('scroll', animateOnScroll);
  }, []);

  return (
    <>
      <style>{`
        body { font-family: Arial, sans-serif; margin:0; padding:0; }
        h2 { color:#2e7d32; }
        p { color:#444; line-height:1.6; }

        /* HERO */
        .about-hero {
          height:60vh;
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          text-align:center;
          color:white;
          background:linear-gradient(rgba(46,125,50,0.7),rgba(46,125,50,0.7)),
                     url("https://images.unsplash.com/photo-1583337130417-51b4a9de0913") center/cover no-repeat;
        }
        .about-hero h1 { font-size:3rem; margin-bottom:15px; animation: fadeInDown 1s ease; }
        .about-hero p { font-size:1.2rem; max-width:700px; animation: fadeIn 1s ease; }

        /* STORY */
        .story { max-width:1000px; margin:80px auto; padding:0 20px; text-align:center; }
        .story h2 { margin-bottom:30px; font-size:2rem; }
        .story p { margin-bottom:20px; }

        /* FEATURES */
        .features { display:flex; justify-content:center; gap:30px; flex-wrap:wrap; margin:50px 20px; }
        .feature-card {
          background:white; padding:30px; border-radius:16px; box-shadow:0 8px 25px rgba(0,0,0,0.1);
          flex:1 1 250px; text-align:center; transition: transform 0.3s, background 0.3s, opacity 1s, transform 1s;
          opacity:0; transform:translateY(50px);
        }
        .feature-card.visible { opacity:1; transform:translateY(0);}
        .feature-card:hover { transform:translateY(-5px) scale(1.02); background:#f1f8f2; }
        .feature-card h3 { margin-bottom:15px; color:#1b5e20; }
        .feature-card p { color:#444; }
        .feature-card svg { width:50px; height:50px; margin-bottom:15px; fill:#2e7d32; animation: iconBounce 2s infinite; }

        /* TEAM */
        .team { max-width:1000px; margin:80px auto; padding:0 20px; text-align:center; }
        .team h2 { margin-bottom:40px; }
        .team-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:25px; }
        .team-card {
          background:white; padding:20px; border-radius:16px; box-shadow:0 8px 20px rgba(0,0,0,0.08);
          transition: transform 0.3s, opacity 1s, transform 1s; opacity:0; transform:translateY(50px);
        }
        .team-card.visible { opacity:1; transform:translateY(0);}
        .team-card:hover { transform:translateY(-5px) scale(1.02);}
        .team-card img { width:120px; height:120px; border-radius:50%; object-fit:cover; margin-bottom:15px; }
        .team-card h3 { margin-bottom:5px; color:#1b5e20; }
        .team-card p { color:#444; }

        /* CTA */
        .about-cta { background:#e8f5e9; padding:80px 20px; text-align:center; border-radius:12px; margin:80px 0; }
        .about-cta h2 { color:#2e7d32; font-size:2rem; margin-bottom:15px; }
        .about-cta p { font-size:1.1rem; color:#444; margin-bottom:25px; }
        .about-cta button { padding:14px 32px; background:#2e7d32; color:white; border-radius:30px; font-size:1.1rem; transition: transform 0.3s, background 0.3s; }
        .about-cta button:hover { transform:scale(1.05); background:#1b5e20; }

        /* ANIMATIONS */
        @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
        @keyframes fadeInDown { from {opacity:0; transform:translateY(-30px);} to {opacity:1; transform:translateY(0);} }
        @keyframes iconBounce { 0%, 100% { transform:translateY(0);} 50% { transform:translateY(-10px);} }

        @media(max-width:768px){
          .about-hero h1{font-size:2.2rem;}
          .about-hero p{font-size:1rem;}
        }
      `}</style>

      {/* HERO */}
      <section className="about-hero">
        <h1>About VetAdopt</h1>
        <p>Connecting pet owners, adopters, and veterinarians through one easy-to-use platform.</p>
      </section>

      {/* OUR STORY */}
      <section className="story">
        <h2>Our Story</h2>
        <p>VetAdopt was built by developers who love animals and tech. Users can list pets for adoption, schedule vet visits, and manage pet care seamlessly.</p>
        <p>By bridging the gap between pet owners, adopters, and veterinary clinics, we ensure pets are cared for and find loving homes faster.</p>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="feature-card fade-on-scroll">
          <svg viewBox="0 0 64 64"><path d="M32 4C18 4 6 16 6 30c0 12 18 30 26 30s26-18 26-30C58 16 46 4 32 4zm0 44c-8-6-14-15-14-20 0-8 6-14 14-14s14 6 14 14c0 5-6 14-14 20z"/></svg>
          <h3>🐾 List Your Pet</h3>
          <p>Add pets for adoption with photos and details easily.</p>
        </div>
        <div className="feature-card fade-on-scroll">
          <svg viewBox="0 0 64 64"><path d="M32 2a28 28 0 1 0 28 28A28 28 0 0 0 32 2zm0 52a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm0-40a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm2 18H30V18h4z"/></svg>
          <h3>🏥 Vet Scheduling</h3>
          <p>Find nearby vets and schedule appointments directly.</p>
        </div>
        <div className="feature-card fade-on-scroll">
          <svg viewBox="0 0 64 64"><path d="M32 4L28 24h8l-4-20zM20 32h24v4H20zM20 42h24v4H20z"/></svg>
          <h3>💚 Track & Connect</h3>
          <p>Monitor your pet’s adoption status and medical history.</p>
        </div>
      </section>

      {/* TEAM */}
      <section className="team">
        <h2>Meet the Team</h2>
        <div className="team-cards">
          {team.map(member => (
            <div key={member.id} className="team-card fade-on-scroll">
              <img src={member.img} alt={member.name} />
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <h2>Get Started with VetAdopt</h2>
        <p>List your pet, schedule vet appointments, and join our growing pet community today.</p>
        <button>Explore Now</button>
      </section>
    </>
  );
}

export default About;
