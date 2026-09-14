import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function EnhancedChatbot({ user }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("vetadopt_chat_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [{
      type: "bot",
      text: user 
        ? `Hi **${user.name || 'there'}**! 🐾 Welcome back! How can I help you today?`
        : "Hi! 🐾 Welcome to **VetAdopt**! How can I help you find your new best friend today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
  });

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("vetadopt_chat_history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClearHistory = (e) => {
    e.stopPropagation();
    const initialMsg = [{
      type: "bot",
      text: user 
        ? `Hi **${user.name || 'there'}**! 🐾 Welcome back! How can I help you today?`
        : "Hi! 🐾 Welcome to **VetAdopt**! How can I help you find your new best friend today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
    setMessages(initialMsg);
    setShowQuickReplies(true);
    localStorage.removeItem("vetadopt_chat_history");
  };

  const getBotResponse = (userMessage) => {
    const message = userMessage.toLowerCase();

    if (message.includes("adopt") || message.includes("how to adopt")) {
      return {
        text: "**Adoption Process**\n\n1. Browse available pets\n2. Take our Matchmaker Quiz\n3. Fill out the application\n4. Meet your potential pet!\n\nWould you like to start browsing?",
        suggestions: ["Browse pets", "Take quiz"],
        action: { label: "🐾 Open Adopt Page", path: "/adopt" }
      };
    }

    if (message.includes("quiz") || message.includes("matchmaker")) {
      return {
        text: "**Pet Matchmaker Quiz**\n\nFind your perfect match in just 2 minutes based on your routine, space, and experience!",
        action: { label: "🎯 Take Quiz Now", path: "/quiz" }
      };
    }

    if (message.includes("vet") || message.includes("clinic") || message.includes("medical")) {
      return {
        text: "**Veterinary Partners**\n\nFind trusted partner clinics, view clinic hours, or check emergency services near you.",
        action: { label: "🏥 Open Vet Map", path: "/vets" }
      };
    }

    if (message.includes("dog") || message.includes("puppy")) {
      return {
        text: "**Our Dogs & Puppies**\n\nAll dogs are vaccinated, health-checked, and ready for adoption!",
        action: { label: "🐕 See All Dogs", path: "/adopt?type=dog" }
      };
    }

    if (message.includes("cat") || message.includes("kitten")) {
      return {
        text: "**Our Cats & Kittens**\n\nLooking for a purrfect companion? Check out available cats!",
        action: { label: "🐱 See All Cats", path: "/adopt?type=cat" }
      };
    }

    return {
      text: "I can assist you with adoption details, finding local vet partners, or taking our matchmaker quiz!\n\nWhat would you like to explore?",
      suggestions: ["How to adopt", "See pets", "Find a vet"]
    };
  };

  const handleSendMessage = (textToSend) => {
    const text = typeof textToSend === "string" ? textToSend : inputMessage;
    if (!text || text.trim() === "") return;

    const userMsg = {
      type: "user",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setShowQuickReplies(false);
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = getBotResponse(text);
      const botMsg = {
        type: "bot",
        text: botResponse.text,
        suggestions: botResponse.suggestions || [],
        action: botResponse.action || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);

      if (!isOpen) setUnreadCount(prev => prev + 1);
    }, 1000);
  };

  const renderFormattedText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const quickReplies = [
    { text: "🏠 How to adopt?" },
    { text: "🎯 Take the quiz" },
    { text: "🐕 See pets" },
    { text: "🏥 Find a vet" }
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setUnreadCount(0); }}
          className="chatbot-trigger-btn shadow-lg position-relative"
          title="Need help? Chat with us!"
        >
          <span className="trigger-icon">🐾</span>
          {unreadCount > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div className={`chatbot-window card border-0 shadow-lg ${isMinimized ? 'minimized' : ''}`}>
          
          {/* Glassmorphism Header */}
          <div 
            className="chatbot-header d-flex justify-content-between align-items-center"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="d-flex align-items-center">
              <div className="avatar-wrapper me-2">
                <span className="avatar-icon">🐾</span>
                <span className="status-dot"></span>
              </div>
              <div>
                <h6 className="mb-0 fw-bold header-title">VetAdopt Assistant</h6>
                <small className="header-subtitle">Always online</small>
              </div>
            </div>

            <div className="d-flex gap-1 align-items-center">
              <button
                onClick={handleClearHistory}
                className="header-action-btn"
                title="Clear Chat"
              >
                🗑️
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="header-action-btn"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? "▲" : "▼"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="header-action-btn"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Body & Input */}
          {!isMinimized && (
            <>
              <div className="chatbot-body overflow-auto">
                {messages.map((message, index) => (
                  <div key={index} className="mb-3">
                    <div className={`d-flex ${message.type === "user" ? "justify-content-end" : "justify-content-start"}`}>
                      <div className={`msg-bubble ${message.type === "user" ? "user-bubble" : "bot-bubble"}`}>
                        <div className="msg-text">
                          {renderFormattedText(message.text)}
                        </div>

                        {message.action && (
                          <button
                            className="btn btn-sm btn-action-cta w-100 mt-2 fw-bold"
                            onClick={() => navigate(message.action.path)}
                          >
                            {message.action.label}
                          </button>
                        )}

                        <div className={`msg-time ${message.type === "user" ? "text-white-50" : "text-muted"}`}>
                          {message.time}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Chips */}
                    {message.suggestions && message.suggestions.length > 0 && index === messages.length - 1 && (
                      <div className="mt-2 d-flex flex-wrap gap-1 ps-1">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            className="chip-btn"
                            onClick={() => handleSendMessage(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Animated Typing Indicator */}
                {isTyping && (
                  <div className="mb-3 d-flex justify-content-start">
                    <div className="msg-bubble bot-bubble typing-bubble">
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Initial Quick Suggestions */}
                {showQuickReplies && messages.length <= 1 && (
                  <div className="mt-3">
                    <small className="text-muted d-block mb-2 fw-bold ps-1" style={{ fontSize: "11px" }}>Quick questions:</small>
                    <div className="d-flex flex-wrap gap-1">
                      {quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          className="chip-btn"
                          onClick={() => handleSendMessage(reply.text)}
                        >
                          {reply.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Footer Input */}
              <div className="chatbot-footer bg-white border-top p-2">
                <div className="input-group align-items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-control chat-input"
                    placeholder="Type a message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <button
                    className="btn send-btn"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim()}
                  >
                    🚀
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modern UI Styles */}
      <style>{`
        /* Trigger Button */
        .chatbot-trigger-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: 3px solid #ffffff;
          color: white;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease;
        }
        .chatbot-trigger-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.5) !important;
        }
        .trigger-icon {
          font-size: 26px;
        }

        /* Window Container */
        .chatbot-window {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 370px;
          height: 560px;
          max-height: 82vh;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          overflow: hidden;
          background: #ffffff;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chatbot-window.minimized {
          height: 64px;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Glassmorphism Header */
        .chatbot-header {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
          backdrop-filter: blur(8px);
          padding: 12px 16px;
          color: white;
          cursor: pointer;
          user-select: none;
        }
        .avatar-wrapper {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .avatar-icon { font-size: 18px; }
        .status-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          background-color: #10b981;
          border: 2px solid white;
          border-radius: 50%;
        }
        .header-title { font-size: 14.5px; }
        .header-subtitle { font-size: 10.5px; opacity: 0.85; }
        .header-action-btn {
          background: transparent;
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        .header-action-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        /* Body & Scrollbar */
        .chatbot-body {
          flex: 1;
          padding: 16px;
          background-color: #f8fafc;
        }
        .chatbot-body::-webkit-scrollbar { width: 5px; }
        .chatbot-body::-webkit-scrollbar-track { background: transparent; }
        .chatbot-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        /* Message Bubbles */
        .msg-bubble {
          max-width: 82%;
          padding: 12px 14px;
          font-size: 13.5px;
          line-height: 1.45;
          word-wrap: break-word;
          white-space: pre-wrap;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
        }
        .bot-bubble {
          background: #ffffff;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-radius: 18px 18px 18px 4px;
        }
        .user-bubble {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border-radius: 18px 18px 4px 18px;
        }
        .msg-time {
          font-size: 9px;
          margin-top: 4px;
          text-align: right;
        }

        /* Buttons & Action CTA */
        .btn-action-cta {
          background-color: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .btn-action-cta:hover {
          background-color: #10b981;
          color: white;
        }
        .chip-btn {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 11.5px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .chip-btn:hover {
          border-color: #10b981;
          color: #10b981;
          transform: translateY(-1px);
        }

        /* Footer Input */
        .chatbot-footer { padding: 10px 14px; }
        .chat-input {
          border: 1px solid #e2e8f0;
          border-radius: 20px !important;
          padding: 8px 14px;
          font-size: 13.5px;
          background: #f8fafc;
          transition: all 0.2s ease;
        }
        .chat-input:focus {
          background: #ffffff;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
        .send-btn {
          background: transparent;
          border: none;
          font-size: 18px;
          padding: 0 8px 0 12px;
          transition: transform 0.2s ease;
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.15);
        }

        /* Typing Dots */
        .typing-bubble { padding: 10px 16px; }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          margin: 0 2px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        /* Responsive */
        @media (max-width: 576px) {
          .chatbot-window {
            width: calc(100vw - 32px) !important;
            right: 16px !important;
            bottom: 16px !important;
          }
          .chatbot-trigger-btn {
            bottom: 16px;
            right: 16px;
          }
        }
      `}</style>
    </>
  );
}

export default EnhancedChatbot;