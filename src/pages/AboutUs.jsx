import { useEffect } from "react";

const TEAM = [
  { id: 1, name: "Nadine Cruz", role: "Frontend Developer", img: "https://randomuser.me/api/portraits/women/68.jpg" },
  { id: 2, name: "Aaron Nash", role: "Backend Developer", img: "https://randomuser.me/api/portraits/men/72.jpg" },
  { id: 3, name: "Sophia Lee", role: "UI/UX Designer", img: "https://randomuser.me/api/portraits/women/65.jpg" },
  { id: 4, name: "Liam Kim", role: "Fullstack Developer", img: "https://randomuser.me/api/portraits/men/65.jpg" },
];

function About() {
  useEffect(() => {
    // Intersection Observer is the "Gold Standard" for scroll animations
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

    const elements = document.querySelectorAll(".fade-on-scroll");
    elements.forEach((el) => observer.observe(el));

    // Cleanup to prevent memory leaks and errors when leaving the page
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        body { font-family: 'Inter', sans-serif; margin:0; padding:0; overflow-x: hidden; }
        
        /* MODERN CURVED HERO */
        .about-hero {
          height: 65vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          color: white;
          background: linear-gradient(rgba(255, 230, 0, 0.8), rgba(6, 126, 6, 0.8)),
                      url("https://images.unsplash.com/photo-1583337130417-51b4a9de0913") center/cover no-repeat;
          /* This creates the modern "Swoosh" at the bottom */
          clip-path: ellipse(150% 100% at 50% 0%);
          padding-bottom: 50px;
        }

        .about-hero h1 { font-size: 3.5rem; margin: 0; }
        .about-hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; }

        /* ANIMATION CLASSES */
        .fade-on-scroll {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .fade-on-scroll.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* SECTION STYLING */
        .content-section { max-width: 1100px; margin: 80px auto; padding: 0 20px; text-align: center; }
        
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-top: 50px; }
        
        .feature-card {
          background: #f3b817;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          border: 1px solid #e2a809;
          transition: transform 0.3s ease;
        }
        .feature-card:hover { transform: translateY(-10px); }

        /* TEAM GRID */
        .team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 40px; margin-top: 50px; }
        .team-member img { 
          width: 160px; height: 160px; 
          border-radius: 50%; 
          object-fit: cover; 
          margin-bottom: 20px;
          border: 5px solid #f3b817;
        }

        /* BUTTONS */
        .cta-btn {
          background: #b68b16;
          color: white;
          padding: 15px 40px;
          border-radius: 50px;
          border: none;
          font-weight: bold;
          font-size: 1.1rem;
          cursor: pointer;
          transition: 0.3s;
        }
        .cta-btn:hover { background: #1b5e20; transform: scale(1.05); }
      `}</style>

      <section className="about-hero">
        <h1 className="fade-on-scroll">Our Mission 🐾</h1>
        <p className="fade-on-scroll">We believe every pet deserves a loving home and every owner deserves a helping hand.</p>
      </section>

      <section className="content-section">
        <h2 style={{color: '#2e7d32', fontSize: '2.5rem'}}>Our Story</h2>
        <p style={{maxWidth: '800px', margin: '20px auto', fontSize: '1.1rem', color: '#555'}}>
          VetAdopt started with a simple goal: to make pet adoption as transparent and easy as possible. 
          By combining tech with a passion for animal welfare, we created a bridge between local shelters and new families.
        </p>

        <div className="feature-grid">
          <div className="feature-card fade-on-scroll">
            <div style={{fontSize: '3rem'}}>🏠</div>
            <h3>Quick Listing</h3>
            <p>Shelters and owners can list pets in under 2 minutes.</p>
          </div>
          <div className="feature-card fade-on-scroll">
            <div style={{fontSize: '3rem'}}>🩺</div>
            <h3>Vet Verified</h3>
            <p>Direct integration with clinics to ensure pet health history.</p>
          </div>
          <div className="feature-card fade-on-scroll">
            <div style={{fontSize: '3rem'}}>🤝</div>
            <h3>Community</h3>
            <p>Join a network of over 10,000 animal lovers nationwide.</p>
          </div>
        </div>
      </section>

      <section className="content-section" style={{background: '#f9f9f9', padding: '100px 20px', borderRadius: '40px'}}>
        <h2 style={{color: '#2e7d32'}}>The Team</h2>
        <div className="team-grid">
          {TEAM.map((member, index) => (
            <div key={member.id} className="team-member fade-on-scroll" style={{transitionDelay: `${index * 0.15}s`}}>
              <img src={member.img} alt={member.name} />
              <h3 style={{margin: '10px 0 5px'}}>{member.name}</h3>
              <p style={{color: '#666'}}>{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section" style={{marginBottom: '100px'}}>
        <h2 className="fade-on-scroll">Ready to make a difference?</h2>
        <button className="cta-btn fade-on-scroll">Explore Pets Now</button>
      </section>
    </>
  );
}

export default About;