function Footer() {
  return (
    <>
      <style>{`
        .footer {
          background: #503e0b;
          color: #e8f5e9;
          padding: 30px 20px;
          margin-top: 60px;
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
      `}</style>

      <footer className="footer">
        <div className="footer-inner">
          <p>🐾 <span>VetAdopt</span> — Caring for Every Paw</p>
          <p>© 2026 VetAdopt. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}

export default Footer;
