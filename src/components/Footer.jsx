function Footer() {
  return (
    <>
      <style>{`
        .footer {
          background: #503e0b;
          color: #e8f5e9;
          padding: 10px 10px;
          margin-top: 300px;
        }

        .footer-inner {
          max-width: 1200px;
          margin: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: center;
        }

        .footer span {
          color: #c8e6c9;
          font-weight: bold;
        }
           /* ── Footer ── */
        .va-footer { background:#051407; color:rgba(255,255,255,0.55); padding:44px 24px; text-align:center; font-size:0.85rem; }
        .va-footer .va-brand { font-size:1.3rem; }
        .va-footer-links { display:flex; gap:22px; justify-content:center; margin:16px 0; flex-wrap:wrap; }
        .va-footer-links button, .va-footer-links a { background:none; border:none; color:rgba(255,255,255,0.55); font-size:0.85rem; cursor:pointer; text-decoration:none; transition:color 0.2s; }
        .va-footer-links button:hover, .va-footer-links a:hover { color:#81c784; }

      `}</style>

       {/* ── FOOTER ── */}
      <footer className="va-footer">
        <button className="va-brand" onClick={() => navigate("/")}>Vet<em>Adopt</em></button>
        <div className="va-footer-links">
          <button onClick={() => navigate("/adopt")}>Adopt</button>
          <button onClick={() => navigate("/petmatchmaker")}>Matchmaker</button>
          <a href="#how">How It Works</a>
          <a href="#stories">Stories</a>
        </div>
        <p>© 2026 VetAdopt · Veterinary-backed pet adoption in Metro Cebu </p>
      </footer>
       
     
    </>
  );
}

export default Footer;
