import { useState, useMemo, useEffect, useRef } from "react";
import { db, auth } from "../Firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

// ─── Data ─────────────────────────────────────────────────────────────────────
const PET_DATA = [
  { 
    id: 1, 
    name: "Buddy", 
    type: "Dog", 
    gender: "Male", 
    age: "2 years", 
    breed: "Labrador Retriever Mix",
    description: "Friendly and energetic golden mix who loves retrieving tennis balls and going on hiking trails.", 
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600", 
    badge: "New",
    tags: ["Vaccinated", "Spayed/Neutered", "Good with Kids"]
  },
  { 
    id: 2, 
    name: "Luna", 
    type: "Dog", 
    gender: "Female", 
    age: "1 year", 
    breed: "Beagle Mix",
    description: "Gentle, loving, and extremely curious. Luna gets along with other dogs and melts hearts instantly.", 
    image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=600", 
    badge: "Puppy",
    tags: ["Vaccinated", "House Trained", "Playful"]
  },
  { 
    id: 3, 
    name: "Milo", 
    type: "Dog", 
    gender: "Male", 
    age: "3 years", 
    breed: "Domestic Short Hair",
    description: "A calm indoor cat who enjoys sunbathing by windows, gentle head scratches, and quiet evenings.", 
    image: "https://t3.ftcdn.net/jpg/00/87/22/60/360_F_87226035_BRfdCZw8Pvbu8QC8P56TZ6ddIYqVZYga.jpg", 
    badge: "",
    tags: ["Vaccinated", "Indoor Only", "Litter Box Trained"]
  },
  { 
    id: 4, 
    name: "Daisy", 
    type: "Dog", 
    gender: "Female", 
    age: "4 months", 
    breed: "Golden Retriever",
    description: "High-energy puppy eager to learn. She picks up new obedience commands in just minutes!", 
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600", 
    badge: "Puppy",
    tags: ["Vaccinated", "Active", "Needs Training"]
  },
  { 
    id: 5, 
    name: "Coco", 
    type: "Golden Retriever", 
    gender: "Female", 
    age: "2 years", 
    breed: "Calico",
    description: "Curious, vocal, and endlessly affectionate. Coco loves greeting her humans right at the front door.", 
    image: "https://i.pinimg.com/736x/bb/fd/85/bbfd8503c0da0be71e039a7ae8805b89.jpg", 
    badge: "New",
    tags: ["Vaccinated", "Affectionate", "Microchipped"]
  },
  { 
    id: 6, 
    name: "Max", 
    type: "Rabbit", 
    gender: "Male", 
    age: "1 year", 
    breed: "Holland Lop",
    description: "Soft, gentle, and partial to fresh greens. Max is quiet, docile, and an ideal apartment pet.", 
    image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=600", 
    badge: "",
    tags: ["Litter Trained", "Quiet", "Indoor"]
  },
  { 
    id: 7, 
    name: "Bella", 
    type: "Dog", 
    gender: "Female", 
    age: "3 years", 
    breed: "German Shepherd Mix",
    description: "Loyal, protective, and highly observant. Bella responds well to commands and makes a great guard companion.", 
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=600", 
    badge: "",
    tags: ["Vaccinated", "Spayed/Neutered", "Smart"]
  },
  { 
    id: 8, 
    name: "Charlie", 
    type: "Parrot", 
    gender: "Male", 
    age: "2 years", 
    breed: "Eclectus Parrot",
    description: "Vibrant and talkative exotic bird. Charlie mimics playful sounds and brightens up any room.", 
    image: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&q=80&w=600", 
    badge: "New",
    tags: ["Health Checked", "Vocal", "Social"]
  },
  { 
    id: 9, 
    name: "Oliver", 
    type: "Cat", 
    gender: "Male", 
    age: "5 months", 
    breed: "Tabby",
    description: "Playful kitten who loves chasing string toys and curling up in warm laps for afternoon naps.", 
    image: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600", 
    badge: "New",
    tags: ["Vaccinated", "Playful", "Good with Cats"]
  },
  { 
    id: 10, 
    name: "Rocky", 
    type: "Dog", 
    gender: "Male", 
    age: "4 years", 
    breed: "Bulldog Mix",
    description: "Easygoing couch potato who enjoys short morning strolls followed by long afternoon naps.", 
    image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=600", 
    badge: "",
    tags: ["Neutered", "Calm", "Low Maintenance"]
  },
  { 
    id: 11, 
    name: "Cleo", 
    type: "Cat", 
    gender: "Female", 
    age: "4 years", 
    breed: "Siamese Mix",
    description: "Elegant cat with striking blue eyes. Cleo is independent yet loves occasional quiet attention.", 
    image: "https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&q=80&w=600", 
    badge: "",
    tags: ["Vaccinated", "Spayed", "Quiet"]
  },
  { 
    id: 12, 
    name: "Peanut", 
    type: "Cat", 
    gender: "Female", 
    age: "8 months", 
    breed: "Mini Rex",
    description: "Super soft velvet coat with a friendly curiosity. Peanut enjoys munching on timothy hay.", 
    image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&q=80&w=600", 
    badge: "New",
    tags: ["Health Checked", "Gentle"]
  },
  { 
    id: 13, 
    name: "Bruno", 
    type: "Husky", 
    gender: "Male", 
    age: "2 years", 
    breed: "Siberian Husky Mix",
    description: "Adventurous and vocal runner. Bruno needs an active owner who loves outdoor sports.", 
    image: "https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&q=80&w=600", 
    badge: "",
    tags: ["Vaccinated", "High Energy", "Friendly"]
  },
  { 
    id: 14, 
    name: "Mocha", 
    type: "Cat", 
    gender: "Female", 
    age: "1 year", 
    breed: "Persian Mix",
    description: "Fluffy and sweet-natured. Mocha loves soft cushions and gentle grooming sessions.", 
    image: "https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&q=80&w=600", 
    badge: "New",
    tags: ["Vaccinated", "Indoor Only", "Gentle"]
  },
  { 
    id: 15, 
    name: "Mango", 
    type: "Parrot", 
    gender: "Female", 
    age: "3 years", 
    breed: "Sun Conure",
    description: "Bright yellow and orange plumage. Mango is intelligent, affectionate, and loves perching on shoulders.", 
    image: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&q=80&w=600", 
    badge: "",
    tags: ["Health Checked", "Interactive"]
  },
  { 
    id: 16, 
    name: "Zoe", 
    type: "Persian Cat", 
    gender: "Female", 
    age: "5 months", 
    breed: "Corgi Mix",
    description: "Playful short-legged pup with tons of personality. Zoe loves learning new tricks and agility games.", 
    image: "https://www.catster.com/wp-content/uploads/2024/03/persian-kitten-playing_ANURAK-PONGPATIMET-Shutterstock.jpg", 
    badge: "",
    tags: ["Vaccinated", "Microchipped", "Playful"]
  }
];

const TYPE_ICONS = { All: "🐾", Dog: "🐶", Cat: "🐱", Rabbit: "🐰", Parrot: "🦜" };
const BADGE_COLORS = { 
  New: { bg: "#e8f5e9", text: "#2e7d32" }, 
  Puppy: { bg: "#fff8e1", text: "#f57f17" } 
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function PetCard({ pet, onAdopt, onZoom, index }) {
  const ref = useRef(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add("visible"); }, 
      { threshold: 0.1 }
    );
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <article
      ref={ref}
      className="pc-card"
      style={{ transitionDelay: `${(index % 4) * 80}ms` }}
    >
      <div className="pc-img-wrap" onClick={() => !imgError && onZoom(pet.image)}>
        {imgError ? (
          <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#e8f0e8",
            color: "#2e7d32",
            textAlign: "center",
            padding: "16px"
          }}>
            <span style={{ fontSize: "2.2rem", marginBottom: "4px" }}>🐾</span>
            <strong style={{ fontSize: "0.85rem" }}>Photo Coming Soon</strong>
          </div>
        ) : (
          <img 
            src={pet.image} 
            alt={pet.name} 
            onError={() => setImgError(true)} 
          />
        )}
        {pet.badge && (
          <span className="pc-badge" style={{ background: BADGE_COLORS[pet.badge]?.bg, color: BADGE_COLORS[pet.badge]?.text }}>
            {pet.badge}
          </span>
        )}
        {!imgError && <div className="pc-zoom-hint">🔍 Tap to inspect</div>}
      </div>
      <div className="pc-body">
        <div className="pc-meta">
          <span>{TYPE_ICONS[pet.type]} {pet.type}</span>
          <span>{pet.gender}</span>
          <span>🕐 {pet.age}</span>
        </div>
        <h3 className="pc-name">{pet.name}</h3>
        <p className="pc-desc">{pet.description}</p>
        
        {/* Capability Tags */}
        <div className="pc-tags">
          {pet.tags?.map((tag, i) => (
            <span key={i} className="pc-tag-chip">• {tag}</span>
          ))}
        </div>

        <button className="pc-adopt-btn" onClick={() => onAdopt(pet)}>
          Adopt {pet.name} →
        </button>
      </div>
    </article>
  );
}

function ModalInput({ type = "text", placeholder, value, onChange, rows, options }) {
  if (options) {
    return (
      <select className="ad-input" value={value} onChange={onChange}>
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  const Tag = rows ? "textarea" : "input";
  return (
    <Tag
      className="ad-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
    />
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Adopt() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedPet, setSelectedPet] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalStep, setModalStep] = useState("login");
  const [sort, setSort] = useState("default");
  const [ageFilter, setAgeFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  
  
  const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
  const [contactData, setContactData] = useState({
    fullName: "",
    age: "",
    address: "",
    occupation: "",
    phone: "",
    houseType: "House (Owned)",
    petExperience: "Beginner",
    reason: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setIsLoggedIn(!!u));
    return unsub;
  }, []);
  const getAgeInMonths = (age) => {
  const value = parseInt(age);

  if (age.toLowerCase().includes("year")) {
    return value * 12;
  }

  return value;
};

  const filteredPets = useMemo(() => {
  return PET_DATA.filter((p) => {
    const q = search.toLowerCase();

    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.breed.toLowerCase().includes(q) ||
      p.tags.some(tag => tag.toLowerCase().includes(q));

    const matchesFilter = filter === "All" || p.type === filter;

    const ageInMonths = getAgeInMonths(p.age);

let matchesAge = true;

if (ageFilter === "Baby")
  matchesAge = ageInMonths <= 6;

if (ageFilter === "Young")
  matchesAge = ageInMonths > 6 && ageInMonths <= 24;

if (ageFilter === "Adult")
  matchesAge = ageInMonths > 24 && ageInMonths <= 84;

if (ageFilter === "Senior")
  matchesAge = ageInMonths > 84;

    return matchesSearch && matchesFilter && matchesAge;

  });
}, [search, filter, ageFilter]);


// Sort the filtered pets
const sortedPets = [...filteredPets];

switch (sort) {
  case "name":
    sortedPets.sort((a, b) => a.name.localeCompare(b.name));
    break;

  case "youngest":
    sortedPets.sort((a, b) => getAgeInMonths(a.age) - getAgeInMonths(b.age));
    break;

  case "oldest":
    sortedPets.sort((a, b) => getAgeInMonths(b.age) - getAgeInMonths(a.age));
    break;

  default:
    break;
}
  const openAdopt = (pet) => {
    setSelectedPet(pet);
    setAuthError("");
    setModalStep(isLoggedIn ? "adopt" : "login");
  };

  const closeModal = () => {
    setSelectedPet(null);
    setContactData({
      fullName: "",
      age: "",
      address: "",
      occupation: "",
      phone: "",
      houseType: "House (Owned)",
      petExperience: "Beginner",
      reason: "",
    });
    setAuthData({ name: "", email: "", password: "" });
    setAuthError("");
  };
  

  const handleAuth = async (type) => {
    if (!authData.email || !authData.password) { 
      setAuthError("Please fill in all required authentication fields."); 
      return; 
    }
    setLoading(true);
    setAuthError("");
    try {
      if (type === "register") {
        if (!authData.name.trim()) { 
          setAuthError("Full name is required."); 
          setLoading(false); 
          return; 
        }
        const res = await createUserWithEmailAndPassword(auth, authData.email, authData.password);
        await updateProfile(res.user, { displayName: authData.name });
      } else {
        await signInWithEmailAndPassword(auth, authData.email, authData.password);
      }
      setModalStep("adopt");
    } catch (err) {
      setAuthError(
        err.code === "auth/wrong-password" 
          ? "Incorrect password." 
          : err.code === "auth/user-not-found" 
          ? "No account found with this email." 
          : err.message 
      );
    }
    setLoading(false);
  };
 

if (sort === "name") {
  sortedPets.sort((a, b) => a.name.localeCompare(b.name));
}

  const handleSubmit = async () => {
    if (!contactData.fullName || !contactData.phone || !contactData.address) {
      setAuthError("Please fill in all basic contact fields (Name, Phone, Address).");
      return;
    }

    setLoading(true);
    setAuthError("");

    try {
      await addDoc(collection(db, "applications"), {
        petId: selectedPet.id,
        petName: selectedPet.name,
        petType: selectedPet.type,
        userId: auth.currentUser.uid,
        fullName: contactData.fullName,
        age: contactData.age,
        address: contactData.address,
        occupation: contactData.occupation,
        phone: contactData.phone,
        email: auth.currentUser.email,
        houseType: contactData.houseType,
        petExperience: contactData.petExperience,
        reason: contactData.reason,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: auth.currentUser.uid,
        text: `Your adoption application for ${selectedPet.name} has been submitted successfully.`,
        createdAt: serverTimestamp(),
      });

      setModalStep("success");
    } catch (err) {
      console.error("Firestore Error:", err);
      setAuthError("Failed to submit application. " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="adopt-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        @keyframes heroIn { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:translateY(0) } }

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .adopt-root { font-family:'DM Sans',sans-serif; background:#f5f8f5; min-height:100vh; color:#1a2e1a; padding-bottom:60px; }

        /* Hero Header */
        .ad-hero {
          position:relative; min-height:420px; display:flex; flex-direction:column;
          align-items:center; justify-content:center; text-align:center;
          padding:80px 24px 110px; overflow:hidden;
          background: linear-gradient(160deg,#1b5e20 0%,#2e7d32 50%,#388e3c 100%);
        }
        .ad-hero-bg {
          position:absolute; inset:0;
          background: url('https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&q=60&w=1200') center/cover no-repeat;
          opacity:0.12;
        }
        .ad-hero h1 {
          font-family:'Fraunces',serif; font-size:clamp(2.4rem, 5vw, 3.6rem); font-weight:900;
          color:white; line-height:1.15; margin-bottom:12px; position:relative;
          animation: heroIn 0.6s ease both;
        }
        .ad-hero h1 em { font-style:italic; color:#a5d6a7; }
        .ad-hero p {
          font-size:1.05rem; color:rgba(255,255,255,0.85); font-weight:400; position:relative;
          animation: heroIn 0.6s 0.1s ease both; max-width:540px; line-height:1.5;
        }
        .ad-hero-stats {
          display:flex; gap:36px; margin-top:28px; position:relative;
          animation: heroIn 0.6s 0.2s ease both;
        }
        .ad-stat-num { font-family:'Fraunces',serif; font-size:2rem; font-weight:900; color:white; line-height:1; }
        .ad-stat-label { font-size:0.7rem; color:rgba(255,255,255,0.7); font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-top:4px; }

        /* Controls Section */
        .ad-controls {
          max-width:900px; margin:-44px auto 0; padding:24px 28px;
          background:white; border-radius:20px;
          box-shadow:0 16px 40px rgba(0,0,0,0.08); position:relative; z-index:10;
          animation: fadeUp 0.5s 0.15s ease both;
          
        }
        .ad-search-wrap { position:relative; margin-bottom:16px; }
        .ad-search-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); font-size:1rem; opacity:0.6; }
        .ad-search {
          width:100%; padding:12px 16px 12px 42px; border:2px solid #e8f0e8;
          border-radius:12px; font-size:0.95rem; font-family:'DM Sans',sans-serif;
          transition:border-color 0.2s; outline:none; color:#1a2e1a;
          
        }
        .ad-search:focus { border-color:#2e7d32; }
        .ad-chips { display:flex; gap:8px; flex-wrap:wrap; }
        .ad-chip {
          padding:8px 18px; border-radius:99px; border:2px solid #e8f0e8;
          background:white; color:#4a634a; font-weight:600; font-size:0.85rem;
          cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif;
          display:flex; align-items:center; gap:6px;
        }
        .ad-chip:hover { border-color:#a5d6a7; background:#f1f8f1; }
        .ad-chip.active { background:#2e7d32; color:white; border-color:#2e7d32; }
      

        /* Grid Section */
        .ad-grid {
          display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
          gap:24px; max-width:1140px; margin:40px auto 0; padding:0 24px;
        }
        .ad-empty { grid-column:1/-1; text-align:center; padding:60px 0; color:#888; }

        /* Pet Card Styles */
        .pc-card {
          background:white; border-radius:20px; overflow:hidden;
          box-shadow:0 4px 16px rgba(0,0,0,0.04); transition:all 0.3s ease;
          opacity:0; transform:translateY(24px); border:1px solid #eef3ee;
        }
        .pc-card.visible { opacity:1; transform:translateY(0); }
        .pc-card:hover { transform:translateY(-6px); box-shadow:0 12px 30px rgba(0,0,0,0.08); }
        
        .pc-img-wrap { position:relative; height:220px; overflow:hidden; cursor:pointer; }
        .pc-img-wrap img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s; }
        .pc-card:hover .pc-img-wrap img { transform:scale(1.05); }
        
        .pc-zoom-hint {
          position:absolute; inset:0; background:rgba(0,0,0,0.25);
          display:flex; align-items:center; justify-content:center;
          color:white; font-size:0.8rem; font-weight:700; opacity:0; transition:0.2s;
        }
        .pc-img-wrap:hover .pc-zoom-hint { opacity:1; }
        .pc-badge {
          position:absolute; top:12px; left:12px; padding:4px 10px;
          border-radius:99px; font-size:0.7rem; font-weight:800; text-transform:uppercase;
        }
        
        .pc-body { padding:20px; }
        .pc-meta { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
        .pc-meta span {
          font-size:0.72rem; font-weight:700; color:#2e7d32; background:#f1f8f1;
          padding:3px 8px; border-radius:6px;
        }
        .pc-name { font-family:'Fraunces',serif; font-size:1.4rem; font-weight:900; color:#1a2e1a; margin-bottom:6px; }
        .pc-desc { font-size:0.85rem; color:#555; line-height:1.5; margin-bottom:14px; min-height:38px; }
        
        .pc-tags { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:18px; }
        .pc-tag-chip { font-size:0.7rem; color:#666; background:#fafafa; border:1px solid #eee; padding:2px 6px; border-radius:4px; }

        .pc-adopt-btn {
          width:100%; padding:11px; border-radius:10px; border:none;
          background:#2e7d32; color:white; font-size:0.88rem; font-weight:700;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.2s;
        }
        .pc-adopt-btn:hover { background:#1b5e20; }

        /* Zoom Modal Overlay */
        .ad-zoom-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.85);
          z-index:3000; display:flex; align-items:center; justify-content:center; cursor:pointer;
        }
        .ad-zoom-img { max-width:90%; max-height:85vh; border-radius:12px; }

        /* Modal Application Window */
        .ad-modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.5);
          z-index:2000; display:flex; align-items:center; justify-content:center;
          padding:16px; backdrop-filter:blur(4px);
        }
        .ad-modal {
          background:white; width:100%; max-width:500px; border-radius:20px;
          padding:32px; position:relative; animation:popIn 0.25s ease;
          max-height:88vh; overflow-y:auto;
        }
        .ad-modal-close {
          position:absolute; top:16px; right:16px; background:#f0f0f0;
          border:none; border-radius:50%; width:30px; height:30px; font-size:0.9rem;
          cursor:pointer; color:#666; display:flex; align-items:center; justify-content:center;
        }
        
        .ad-modal-pet-strip {
          display:flex; align-items:center; gap:12px; padding:10px 14px;
          background:#f1f8f1; border-radius:10px; margin-bottom:20px;
        }
        .ad-modal-pet-img { width:48px; height:48px; border-radius:8px; object-fit:cover; }
        .ad-modal-pet-name { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:900; color:#1a2e1a; }
        .ad-modal-pet-type { font-size:0.75rem; color:#2e7d32; font-weight:700; }

        .ad-modal h2 { font-family:'Fraunces',serif; font-size:1.5rem; font-weight:900; color:#1a2e1a; margin-bottom:4px; }
        .ad-modal-sub { font-size:0.85rem; color:#666; margin-bottom:18px; }

        .ad-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
        .ad-form-full { grid-column: 1 / -1; }

        .ad-label { display:block; font-size:0.7rem; font-weight:700; text-transform:uppercase; color:#2e7d32; margin-bottom:4px; margin-top:12px; letter-spacing:0.04em; }
        .ad-input {
          width:100%; padding:10px 12px; border:1px solid #dcdfdc; border-radius:8px;
          font-size:0.88rem; font-family:'DM Sans',sans-serif; color:#1a2e1a;
          outline:none; transition:border-color 0.2s; background:#fafafa;
        }
        .ad-input:focus { border-color:#2e7d32; background:white; }
        
        .ad-error { font-size:0.8rem; color:#d32f2f; margin-top:10px; font-weight:600; }
        .ad-switch { font-size:0.85rem; color:#666; text-align:center; margin-top:14px; }
        .ad-switch span { color:#2e7d32; font-weight:700; cursor:pointer; }
        
        .ad-submit-btn {
          width:100%; padding:12px; border-radius:10px; border:none; margin-top:20px;
          background:#2e7d32; color:white; font-size:0.9rem; font-weight:700;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.2s;
        }
        .ad-submit-btn:hover:not(:disabled) { background:#1b5e20; }
        .ad-submit-btn:disabled { background:#ccc; cursor:not-allowed; }

        .ad-success { text-align:center; padding:10px 0; }
        .ad-success-icon { font-size:3.5rem; margin-bottom:12px; display:block; }
/* ===== Layout ===== */
.ad-layout{
  max-width:1400px;
  margin:auto;
  display:grid;
  grid-template-columns:280px 1fr;
  gap:30px;
  padding:40px 24px;
}

.ad-sidebar{
    position: sticky;
    top: 90px;

    height: calc(100vh - 110px);

    overflow-y: auto;
    overflow-x: hidden;

    padding-right: 8px;
}
.ad-sidebar::-webkit-scrollbar{
    width:8px;
}

.ad-sidebar::-webkit-scrollbar-track{
    background:#f1f1f1;
    border-radius:10px;
}

.ad-sidebar::-webkit-scrollbar-thumb{
    background:#2e7d32;
    border-radius:10px;
}

.ad-sidebar::-webkit-scrollbar-thumb:hover{
    background:#1b5e20;
}
.sidebar-filter{
  width:100%;
  margin-bottom:10px;
  padding:12px;
  border:none;
  border-radius:12px;
  background:#4E4441;
  cursor:pointer;
  text-align:left;
  font-weight:600;
  transition:.2s;
}

.sidebar-filter:hover{
    background:#e8f5e9;
}

.sidebar-filter.active{
    background:#2e7d32;
    color:white;
}
}

.ad-main{
  width:100%;
}
  .ad-controls{
    display:flex;
    gap:20px;
    align-items:center;
    margin-bottom:5px;
}

.ad-search-wrap{
    flex:1;
}

.ad-sort{
    padding:12px 16px;
    border-radius:12px;
    border:1px solid #ddd;
    background:white;
    cursor:pointer;
}

/* ===== Sidebar Cards ===== */
.side-card{
  background:#817673;
  border-radius:18px;
  padding:20px;
  margin-bottom:20px;
  box-shadow:0 8px 20px rgba(0,0,0,.08);
}

.side-card h3{
  color:##0A0404;
  margin-bottom:12px;
  font-size:1.1rem;
}

.side-card p{
  color:#666;
  line-height:1.5;
}

.side-card ol{
  padding-left:18px;
}

.side-card li{
  margin:8px 0;
}
  .side-card h4{
    margin-top:20px;
    margin-bottom:10px;
    color:#0A0404;
    font-size:15px;
}

.reset-btn{
    width:100%;
    margin-top:20px;
    padding:12px;
    border:none;
    border-radius:12px;
    background:#ef5350;
    color:white;
    cursor:pointer;
    font-weight:600;
    transition:.3s;
}

.reset-btn:hover{
    background:#d32f2f;
}

/* Mobile */
@media(max-width:900px){
  .ad-layout{
    grid-template-columns:1fr;
  }

  .ad-sidebar{
    position:static;
  }
}
        @media(max-width:600px) {
          .ad-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Hero Header */}
      <section className="ad-hero">
        <div className="ad-hero-bg" />
        <h1>Find Your <em>Forever</em> Companion</h1>
        <p>Every pet listed here is rescued, microchipped, fully vaccinated, and ready for adoption.</p>
        <div className="ad-hero-stats">
          <div className="ad-stat">
            <div className="ad-stat-num">{PET_DATA.length}</div>
            <div className="ad-stat-label">Available Pets</div>
          </div>
          <div className="ad-stat">
            <div className="ad-stat-num">100%</div>
            <div className="ad-stat-label">Rescued</div>
          </div>
        </div>
      </section>

      <div className="ad-layout">

  {/* Sidebar */}
  <aside className="ad-sidebar">

  <div className="side-card">

  <h3>🐾 Find Your Perfect Pet</h3>

  <h4>Species</h4>

  {Object.keys(TYPE_ICONS).map((cat) => (
    <button
      key={cat}
      className={`sidebar-filter ${filter === cat ? "active" : ""}`}
      onClick={() => setFilter(cat)}
    >
      {TYPE_ICONS[cat]} {cat === "All" ? "All Pets" : `${cat}s`}
    </button>
  ))}

  <h4>Age</h4>

  {["All", "Baby", "Young", "Adult", "Senior"].map((age) => (
    <button
      key={age}
      className={`sidebar-filter ${ageFilter === age ? "active" : ""}`}
      onClick={() => setAgeFilter(age)}
    >
      {age}
    </button>
  ))}

  <h4>Gender</h4>

  {["All", "Male", "Female"].map((gender) => (
    <button
      key={gender}
      className={`sidebar-filter ${genderFilter === gender ? "active" : ""}`}
      onClick={() => setGenderFilter(gender)}
    >
      {gender}
    </button>
  ))}

  <button
    className="reset-btn"
    onClick={() => {
      setSearch("");
      setFilter("All");
      setAgeFilter("All");
      setGenderFilter("All");
      setSort("default");
    }}
  >
    ↺ Reset Filters
  </button>

</div>
  <div className="side-card">
    <h3>📊 Available Pets</h3>

    <p>🐶 Dogs: {PET_DATA.filter(p=>p.type==="Dog").length}</p>
    <p>🐱 Cats: {PET_DATA.filter(p=>p.type==="Cat").length}</p>
    <p>🐰 Rabbits: {PET_DATA.filter(p=>p.type==="Rabbit").length}</p>
    <p>🦜 Birds: {PET_DATA.filter(p=>p.type==="Bird").length}</p>
  </div>

  <div className="side-card">

  <h3>💚 Need Help?</h3>

  <p>
    Not sure which pet is the best fit for your lifestyle?
  </p>

  <button
    className="pc-adopt-btn"
    onClick={() => navigate("/petmatchmaker")}
  >
    Try Pet Matchmaker
  </button>

</div>

</aside>
  {/* Main Content */}
  <main className="ad-main">

  {/* Search */}
  <div className="ad-controls">

  <div className="ad-search-wrap">
    <span className="ad-search-icon">🔍</span>

    <input
      className="ad-search"
      placeholder="Search pets..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  <select
    className="ad-sort"
    value={sort}
    onChange={(e) => setSort(e.target.value)}
  >
    <option value="default">Sort By</option>
    <option value="name">Name (A-Z)</option>
    <option value="youngest">Youngest</option>
    <option value="oldest">Oldest</option>
  </select>

</div>


  {/* Pet Grid */}
  <div className="ad-grid">
    {filteredPets.length === 0 ? (
      <div className="ad-empty">
        <p>
          No pets found matching "<strong>{search}</strong>".
        </p>
      </div>
    ) : (
     sortedPets.map((pet, i) => (
        <PetCard
          key={pet.id}
          pet={pet}
          index={i}
          onAdopt={openAdopt}
          onZoom={setZoomImage}
        />
      ))
    )}
  </div>
 

</main>

</div> {/* closes ad-layout */}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div className="ad-zoom-overlay" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="ad-zoom-img" alt="Zoomed View" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Main Adoption Application / Auth Modal */}
      {selectedPet && (
        <div className="ad-modal-overlay" onClick={closeModal}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ad-modal-close" onClick={closeModal}>✕</button>

            {modalStep === "adopt" && (
              <div className="ad-modal-pet-strip">
                <img className="ad-modal-pet-img" src={selectedPet.image} alt={selectedPet.name} onError={(e) => { e.target.style.display = 'none'; }} />
                <div>
                  <div className="ad-modal-pet-name">{selectedPet.name}</div>
                  <div className="ad-modal-pet-type">{selectedPet.breed || selectedPet.type} · {selectedPet.gender} · {selectedPet.age}</div>
                </div>
              </div>
            )}

            {/* Login View */}
            {!isLoggedIn && modalStep === "login" && (
              <>
                <h2>Welcome Back 👋</h2>
                <p className="ad-modal-sub">Log in to process your adoption application.</p>
                <label className="ad-label">Email Address</label>
                <ModalInput type="email" placeholder="you@example.com" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                <label className="ad-label">Password</label>
                <ModalInput type="password" placeholder="Enter password" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                {authError && <p className="ad-error">⚠️ {authError}</p>}
                <button className="ad-submit-btn" onClick={() => handleAuth("login")} disabled={loading}>
                  {loading ? "Logging in..." : "Continue with Login"}
                </button>
                <p className="ad-switch">Need an account? <span onClick={() => { setModalStep("register"); setAuthError(""); }}>Create one</span></p>
              </>
            )}

            {/* Registration View */}
            {!isLoggedIn && modalStep === "register" && (
              <>
                <h2>Create Account 🐾</h2>
                <p className="ad-modal-sub">Register to file your official adoption request.</p>
                <label className="ad-label">Full Name</label>
                <ModalInput placeholder="Juan Dela Cruz" value={authData.name} onChange={(e) => setAuthData({ ...authData, name: e.target.value })} />
                <label className="ad-label">Email Address</label>
                <ModalInput type="email" placeholder="you@example.com" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} />
                <label className="ad-label">Password</label>
                <ModalInput type="password" placeholder="Minimum 6 characters" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} />
                {authError && <p className="ad-error">⚠️ {authError}</p>}
                <button className="ad-submit-btn" onClick={() => handleAuth("register")} disabled={loading}>
                  {loading ? "Registering..." : "Register Account"}
                </button>
                <p className="ad-switch">Already registered? <span onClick={() => { setModalStep("login"); setAuthError(""); }}>Log in</span></p>
              </>
            )}

            {/* Comprehensive Application Form */}
            {modalStep === "adopt" && (
              <>
                <h2>Adoption Form</h2>
                <p className="ad-modal-sub">Please fill out this form for system validation and review.</p>

                <div className="ad-form-grid">
                  <div className="ad-form-full">
                    <label className="ad-label">Applicant Name</label>
                    <ModalInput placeholder="Juan Dela Cruz" value={contactData.fullName} onChange={(e) => setContactData({ ...contactData, fullName: e.target.value })} />
                  </div>

                  <div>
                    <label className="ad-label">Age</label>
                    <ModalInput type="number" placeholder="21" value={contactData.age} onChange={(e) => setContactData({ ...contactData, age: e.target.value })} />
                  </div>

                  <div>
                    <label className="ad-label">Occupation</label>
                    <ModalInput placeholder="Software Developer" value={contactData.occupation} onChange={(e) => setContactData({ ...contactData, occupation: e.target.value })} />
                  </div>

                  <div className="ad-form-full">
                    <label className="ad-label">Phone Number</label>
                    <ModalInput type="tel" placeholder="+63 900 000 0000" value={contactData.phone} onChange={(e) => setContactData({ ...contactData, phone: e.target.value })} />
                  </div>

                  <div className="ad-form-full">
                    <label className="ad-label">Complete Home Address</label>
                    <ModalInput placeholder="House No., Street, Barangay, City, Province" value={contactData.address} onChange={(e) => setContactData({ ...contactData, address: e.target.value })} />
                  </div>

                  <div>
                    <label className="ad-label">Housing Type</label>
                    <ModalInput
                      value={contactData.houseType}
                      onChange={(e) => setContactData({ ...contactData, houseType: e.target.value })}
                      options={[
                        { label: "House (Owned)", value: "House (Owned)" },
                        { label: "House (Rented)", value: "House (Rented)" },
                        { label: "Apartment / Condo", value: "Apartment / Condo" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="ad-label">Pet Experience</label>
                    <ModalInput
                      value={contactData.petExperience}
                      onChange={(e) => setContactData({ ...contactData, petExperience: e.target.value })}
                      options={[
                        { label: "Beginner (First Time)", value: "Beginner" },
                        { label: "Intermediate (Had pets before)", value: "Intermediate" },
                        { label: "Experienced Owner", value: "Experienced" },
                      ]}
                    />
                  </div>

                  <div className="ad-form-full">
                    <label className="ad-label">Reason for Adoption</label>
                    <ModalInput
                      rows={3}
                      placeholder="Why do you wish to adopt this pet?"
                      value={contactData.reason}
                      onChange={(e) => setContactData({ ...contactData, reason: e.target.value })}
                    />
                  </div>
                </div>

                {authError && <p className="ad-error">⚠️ {authError}</p>}

                <button className="ad-submit-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Submitting Application..." : "Submit Adoption Application"}
                </button>
              </>
            )}

            {/* Success View */}
            {modalStep === "success" && (
              <div className="ad-success">
                <span className="ad-success-icon">🎉</span>
                <h2>Application Logged</h2>
                <p>Your application for <strong>{selectedPet.name}</strong> was created successfully in Firestore and marked as <strong>Pending</strong>.</p>
                <button className="ad-submit-btn" onClick={closeModal}>Return to Catalog</button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    


  );
}