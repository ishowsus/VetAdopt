import { useState } from "react";

const INITIAL_STORIES = [
  { id: 1, petName: "Bruno", owner: "Maria S.", story: "Bruno has become the heart of our home in Lapu-Lapu! He loves his morning walks by the beach.", image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80" },
  { id: 2, petName: "Luna", owner: "Kevin C.", story: "Luna was shy at first, but now she's the queen of the couch. Thank you VetAdopt!", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80" }
];

function SuccessStories() {
  const [stories, setStories] = useState(INITIAL_STORIES);
  const [showForm, setShowForm] = useState(false);
  const [newStory, setNewStory] = useState({ petName: "", owner: "", story: "", image: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    setStories([{ id: Date.now(), ...newStory }, ...stories]);
    setNewStory({ petName: "", owner: "", story: "", image: "" });
    setShowForm(false);
    alert("Your story has been shared! ❤️");
  };

  return (
    <div className="stories-page">
      <style>{`
        .stories-page { padding: 50px 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        .header-box { text-align: center; margin-bottom: 40px; }
        .header-box h1 { color: #2e7d32; font-size: 2.5rem; }
        
        .story-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 30px; }
        .story-card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.05); transition: 0.3s; }
        .story-card:hover { transform: translateY(-5px); }
        .story-img { width: 100%; height: 250px; object-fit: cover; }
        .story-content { padding: 20px; }
        
        .share-btn { background: #ffb300; color: #2e7d32; border: none; padding: 15px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; display: block; margin: 20px auto; }
        
        /* Modal Form */
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-content { background: white; padding: 30px; border-radius: 25px; width: 100%; max-width: 500px; }
        .modal-content input, .modal-content textarea { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; }
      `}</style>

      <div className="header-box">
        <h1>Happy Tails in Cebu 🐾</h1>
        <p>Real stories from real families who found their best friends here.</p>
        <button className="share-btn" onClick={() => setShowForm(true)}>+ Share Your Story</button>
      </div>

      <div className="story-grid">
        {stories.map(s => (
          <div key={s.id} className="story-card">
            <img src={s.image || "https://via.placeholder.com/400"} alt={s.petName} className="story-img" />
            <div className="story-content">
              <h3 style={{color: '#2e7d32', margin: '0 0 10px 0'}}>{s.petName} & {s.owner}</h3>
              <p style={{color: '#555', lineHeight: '1.6'}}>"{s.story}"</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal">
          <form className="modal-content" onSubmit={handleSubmit}>
            <h2 style={{color: '#2e7d32'}}>Tell us your story!</h2>
            <input placeholder="Pet's Name" required value={newStory.petName} onChange={e => setNewStory({...newStory, petName: e.target.value})} />
            <input placeholder="Your Name" required value={newStory.owner} onChange={e => setNewStory({...newStory, owner: e.target.value})} />
            <textarea placeholder="Tell us about your life together..." rows="4" required value={newStory.story} onChange={e => setNewStory({...newStory, story: e.target.value})} />
            <input placeholder="Image URL (e.g. Unsplash or Imgur link)" value={newStory.image} onChange={e => setNewStory({...newStory, image: e.target.value})} />
            <button type="submit" className="share-btn" style={{width: '100%'}}>Post Success Story</button>
            <button type="button" onClick={() => setShowForm(false)} style={{width: '100%', background: 'none', border: 'none', color: '#888', marginTop: '10px', cursor: 'pointer'}}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default SuccessStories;