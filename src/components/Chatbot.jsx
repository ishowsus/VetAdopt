import React, { useState, useRef, useEffect } from "react";

function EnhancedChatbot({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      text: user 
        ? `Hi ${user.name || 'there'}! 🐾 Welcome back! How can I help you today?`
        : "Hi! 🐾 Welcome to our Pet Adoption Platform! How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Update welcome message when user logs in/out
  useEffect(() => {
    setMessages([{
      type: "bot",
      text: user 
        ? `Hi ${user.name || 'there'}! 🐾 Welcome back! How can I help you today?`
        : "Hi! 🐾 Welcome to our Pet Adoption Platform! How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  }, [user]);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === "bot") {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, isOpen]);

  // Clear unread when chat opens
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Enhanced bot responses with emojis and formatting
  const getBotResponse = (userMessage) => {
    const message = userMessage.toLowerCase();

    // Greetings
    if (message.includes("hello") || message.includes("hi") || message.includes("hey")) {
      return {
        text: user 
          ? `Hello ${user.name}! 😊 Ready to find your perfect pet companion?`
          : "Hello! 😊 I can help you find your perfect pet! Would you like to learn about adoption?",
        suggestions: user 
          ? ["Browse pets", "Take quiz", "Adoption process"]
          : ["Learn about adoption", "Create account", "Contact us"]
      };
    }

    // Adoption Process
    if (message.includes("adopt") || message.includes("adoption") || message.includes("how to adopt")) {
      if (!user) {
        return {
          text: "🏠 **Adoption Process**\n\n1️⃣ Create an account (Register)\n2️⃣ Browse available pets\n3️⃣ Take our Pet Matchmaker Quiz\n4️⃣ Submit an adoption application\n5️⃣ Meet your potential pet!\n\nReady to start?",
          suggestions: ["Register now", "Learn more", "See requirements"]
        };
      }
      return {
        text: "🏠 **Ready to Adopt?**\n\n1️⃣ Browse pets in the Adopt section\n2️⃣ Take the Pet Matchmaker Quiz\n3️⃣ Select a pet you love\n4️⃣ Fill out the application\n5️⃣ Our team reviews (24-48 hrs)\n6️⃣ Meet & greet!\n\n*Most applications are approved within 2 days!*",
        suggestions: ["Browse pets", "Take quiz", "Application status"]
      };
    }

    // Pet Matchmaker Quiz
    if (message.includes("quiz") || message.includes("matchmaker") || message.includes("perfect pet")) {
      if (!user) {
        return {
          text: "🎯 **Pet Matchmaker Quiz**\n\nDiscover your perfect companion! Our quiz considers:\n\n✨ Your lifestyle\n🏡 Living space\n⏰ Available time\n💪 Activity level\n\n*Login required to save results!*",
          suggestions: ["Login", "Learn more"]
        };
      }
      return {
        text: "🎯 **Pet Matchmaker Quiz**\n\nFind your perfect match in just 2 minutes!\n\nThe quiz will ask about:\n• Your daily routine\n• Home environment\n• Pet preferences\n• Experience level\n\nReady to discover your ideal companion?",
        suggestions: ["Start quiz", "See sample questions"]
      };
    }

    // Dogs
    if (message.includes("dog") || message.includes("puppy")) {
      return {
        text: "🐕 **Our Amazing Dogs**\n\nWe have dogs of all types:\n\n🐶 Playful puppies (3-12 months)\n🦮 Active adults (1-7 years)\n🐕‍🦺 Calm seniors (7+ years)\n\nSizes: Tiny to Giant\nBreeds: 20+ available\n\n*Every dog is health-checked, vaccinated, and ready for love!*",
        suggestions: ["See all dogs", "Small dogs", "Large dogs", "Puppies"]
      };
    }

    // Cats
    if (message.includes("cat") || message.includes("kitten")) {
      return {
        text: "🐱 **Our Adorable Cats**\n\nDiscover your purrfect match:\n\n😺 Playful kittens\n😸 Cuddly adults\n😻 Wise seniors\n\nPersonalities:\n• Social butterflies\n• Independent spirits\n• Lap warmers\n• Adventure seekers\n\n*All cats are FIV/FeLV tested!*",
        suggestions: ["See all cats", "Kittens", "Indoor cats"]
      };
    }

    // Fees with breakdown
    if (message.includes("fee") || message.includes("cost") || message.includes("price")) {
      return {
        text: "💰 **Adoption Fees**\n\n🐕 Dogs: $50-$200\n🐱 Cats: $50-$150\n🐰 Small pets: $25-$75\n\n**What's Included:**\n✅ Spay/neuter surgery\n✅ All vaccinations\n✅ Microchip\n✅ Health exam\n✅ Deworming\n✅ Flea treatment\n\n*100% of fees help rescue more animals!*",
        suggestions: ["Payment options", "Discounts available?"]
      };
    }

    // Donations
    if (message.includes("donat") || message.includes("support")) {
      if (!user) {
        return {
          text: "💚 **Thank You for Caring!**\n\nYour donation helps us:\n\n🏥 Provide medical care\n🍖 Feed hungry animals\n🏠 Maintain our shelter\n💉 Vaccinate newcomers\n🚑 Rescue emergencies\n\n*Every dollar makes a difference!*\n\nLogin to donate securely.",
          suggestions: ["Login", "Other ways to help"]
        };
      }
      return {
        text: "💚 **Support Our Mission**\n\n**One-time donations:**\n• $25 - Feeds 5 pets for a week\n• $50 - Vaccinates 2 pets\n• $100 - Spays/neuters 1 pet\n• Custom amount\n\n**Monthly giving:**\n• Become a Pet Hero!\n• Exclusive updates\n• Adoption discounts\n\n*Tax-deductible receipts provided!*",
        suggestions: ["Donate now", "Monthly giving", "Other ways to help"]
      };
    }

    // Veterinarians
    if (message.includes("vet") || message.includes("veterinar") || message.includes("medical")) {
      if (!user) {
        return {
          text: "🏥 **Veterinary Partners**\n\nWe work with trusted local vets!\n\nOur Vet Map shows:\n📍 Nearby clinics\n🕐 Hours & availability\n💬 Reviews & ratings\n📞 Direct contact\n🚑 Emergency services\n\n*Login to access the interactive map!*",
          suggestions: ["Login", "Emergency vet info"]
        };
      }
      return {
        text: "🏥 **Find a Vet Near You**\n\nOur interactive Vet Map includes:\n\n✨ 50+ partner clinics\n📍 Real-time directions\n💰 Price transparency\n⭐ User reviews\n📅 Appointment booking\n🚑 24/7 emergency care\n\n*All our partners offer adoption discounts!*",
        suggestions: ["Open Vet Map", "Emergency care", "Wellness plans"]
      };
    }

    // Requirements
    if (message.includes("requirement") || message.includes("qualify")) {
      return {
        text: "📋 **Adoption Requirements**\n\n**Basic Requirements:**\n✓ 18+ years old\n✓ Valid ID\n✓ Stable housing\n✓ Landlord approval (if renting)\n✓ Vet reference (if you've had pets)\n\n**The Process:**\n1. Application (15 mins)\n2. Home check (some pets)\n3. Meet & greet\n4. Final approval\n\n*We're here to help you succeed!*",
        suggestions: ["Start application", "Rental tips", "More details"]
      };
    }

    // Profile/Account
    if (message.includes("account") || message.includes("profile")) {
      if (!user) {
        return {
          text: "👤 **Create Your Account**\n\nWith an account you can:\n\n🐾 Browse all available pets\n🎯 Take the matchmaker quiz\n📝 Submit applications\n💚 Make donations\n📊 Track your applications\n🔔 Get adoption alerts\n\n*It's free and takes 2 minutes!*",
          suggestions: ["Register now", "Learn more"]
        };
      }
      return {
        text: "👤 **Your Account**\n\nIn your profile you can:\n\n✏️ Update personal info\n📝 View applications\n💚 Track donations\n🔔 Manage notifications\n⭐ Save favorite pets\n📸 Upload photos\n\n*Keep your info current for faster approvals!*",
        suggestions: ["Go to profile", "Application status"]
      };
    }

    // Emergency
    if (message.includes("emergency") || message.includes("urgent") || message.includes("help")) {
      return {
        text: "🚨 **Emergency Resources**\n\n**Found a stray?**\n→ Call Animal Control: 555-0123\n\n**Lost your pet?**\n→ Report immediately: 555-0124\n\n**Injured animal?**\n→ 24/7 Emergency Vet: 555-0125\n\n**Abuse/neglect?**\n→ Report: 555-0126\n\n*We're here 24/7 for emergencies!*",
        suggestions: ["Report found pet", "Lost pet help"]
      };
    }

    // Volunteer
    if (message.includes("volunteer") || message.includes("help out")) {
      return {
        text: "🙌 **Join Our Team!**\n\n**Volunteer Opportunities:**\n\n🐕 Dog walker (Tue-Sun)\n🐱 Cat socializer (Daily)\n📸 Photography (Events)\n🚗 Transport help (As needed)\n🎉 Event assistant (Monthly)\n💻 Social media (Remote)\n\n**Benefits:**\n• Meet amazing pets\n• Build your resume\n• Free training\n• Community service hours\n\n*Background check required*",
        suggestions: ["Apply to volunteer", "See schedule", "Virtual opportunities"]
      };
    }

    // Contact
    if (message.includes("contact") || message.includes("phone") || message.includes("email")) {
      return {
        text: "📞 **Get In Touch**\n\n📧 Email: support@petadoption.com\n📱 Phone: 1-800-PET-LOVE\n💬 Text: 555-PETS-247\n\n**Hours:**\n🕐 Mon-Fri: 9AM-6PM\n🕐 Saturday: 10AM-4PM\n🕐 Sunday: 12PM-4PM\n\n📍 123 Pet Street, City, State\n\n*Emergency line available 24/7!*",
        suggestions: ["Visit us", "Send email", "Schedule visit"]
      };
    }

    // Success stories
    if (message.includes("success") || message.includes("stories") || message.includes("happy")) {
      return {
        text: "❤️ **Happy Tails!**\n\nThis year we've:\n\n🎉 Found homes for 500+ pets\n😊 98% adoption success rate\n⭐ 4.9/5 adopter satisfaction\n\n**Recent Success:**\n\"Max found his forever home after 3 years! His new family sends us photos every week. Thank you for making this possible!\" - Sarah M.\n\n*Every adoption is a celebration!*",
        suggestions: ["Read more stories", "Share your story"]
      };
    }

    // Thank you
    if (message.includes("thank")) {
      return {
        text: "🐾 You're so welcome! Is there anything else I can help you with?\n\n*We're always here to help you find your perfect companion!*",
        suggestions: ["Browse pets", "Take quiz", "Donate"]
      };
    }

    // Bye
    if (message.includes("bye") || message.includes("goodbye")) {
      return {
        text: "👋 Goodbye! Thanks for caring about animals.\n\n*Come back soon! Every pet deserves a loving home.* 🐾❤️",
        suggestions: []
      };
    }

    // Default with helpful menu
    return {
      text: "I'm here to help! Here's what I can assist with:\n\n🐾 **Adoption**\n• Process & requirements\n• Available pets\n• Application help\n\n🎯 **Pet Matchmaker**\n• Find your perfect match\n• Quiz questions\n\n💰 **Support**\n• Adoption fees\n• Donations\n• Volunteering\n\n🏥 **Resources**\n• Vet locations\n• Emergency help\n• Pet care tips\n\nWhat would you like to know?",
      suggestions: ["How to adopt", "See pets", "Take quiz", "Donate"]
    };
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() === "") return;

    // Add user message
    const userMsg = {
      type: "user",
      text: inputMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, userMsg]);
    setInputMessage("");
    setShowQuickReplies(false);

    // Show typing indicator
    setIsTyping(true);

    // Simulate bot thinking/typing delay
    setTimeout(() => {
      const botResponse = getBotResponse(inputMessage);
      const botMsg = {
        type: "bot",
        text: botResponse.text || botResponse,
        suggestions: botResponse.suggestions || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initial quick reply buttons
  const quickReplies = user
    ? [
        { text: "🏠 How to adopt?", icon: "🏠" },
        { text: "🎯 Take the quiz", icon: "🎯" },
        { text: "🐕 See pets", icon: "🐕" },
        { text: "🏥 Find a vet", icon: "🏥" }
      ]
    : [
        { text: "🏠 How to adopt?", icon: "🏠" },
        { text: "🐾 Available pets?", icon: "🐾" },
        { text: "💰 Adoption fees", icon: "💰" },
        { text: "👤 Create account", icon: "👤" }
      ];

  const handleQuickReply = (reply) => {
    setInputMessage(reply);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  return (
    <>
      {/* Chat Button (Bottom Right) with notification badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-success rounded-circle shadow-lg position-relative"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "65px",
            height: "65px",
            zIndex: 1000,
            fontSize: "28px",
            border: "3px solid white",
            animation: "pulse 2s infinite"
          }}
          title="Need help? Chat with us!"
        >
          🐾
          {unreadCount > 0 && (
            <span 
              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              style={{ fontSize: "11px" }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="card shadow-lg"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "380px",
            height: isMinimized ? "60px" : "550px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            transition: "height 0.3s ease",
            borderRadius: "15px",
            overflow: "hidden"
          }}
        >
          {/* Chat Header */}
          <div 
            className="card-header text-white d-flex justify-content-between align-items-center"
            style={{
              background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
              padding: "12px 15px",
              cursor: "pointer"
            }}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="d-flex align-items-center">
              <div 
                className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2"
                style={{ width: "40px", height: "40px", fontSize: "20px" }}
              >
                🐾
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Pet Adoption Helper</h6>
                <small style={{ fontSize: "11px", opacity: 0.9 }}>
                  <span className="badge bg-light text-success" style={{ fontSize: "9px" }}>
                    ● Online
                  </span>
                  {" "}Always here to help!
                </small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="btn btn-sm text-white p-0"
                style={{ fontSize: "20px", background: "none", border: "none", width: "30px" }}
              >
                {isMinimized ? "▲" : "▼"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="btn btn-sm text-white p-0"
                style={{ fontSize: "22px", background: "none", border: "none", width: "30px" }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Body (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Chat Messages */}
              <div
                className="card-body overflow-auto"
                style={{
                  flex: 1,
                  backgroundColor: "#f8f9fa",
                  backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0z\" fill=\"%23e9ecef\" fill-opacity=\"0.1\"/%3E%3C/svg%3E')"
                }}
              >
                {messages.map((message, index) => (
                  <div key={index}>
                    <div
                      className={`mb-3 d-flex ${message.type === "user" ? "justify-content-end" : "justify-content-start"}`}
                      style={{
                        animation: "fadeIn 0.3s ease-in"
                      }}
                    >
                      <div
                        className={`p-3 rounded-3 ${
                          message.type === "user"
                            ? "bg-success text-white"
                            : "bg-white border shadow-sm"
                        }`}
                        style={{
                          maxWidth: "80%",
                          wordWrap: "break-word",
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
                          {message.text}
                        </div>
                        <small
                          className={message.type === "user" ? "text-white-50" : "text-muted"}
                          style={{ fontSize: "10px" }}
                        >
                          {message.time}
                        </small>
                      </div>
                    </div>

                    {/* Suggestion chips */}
                    {message.suggestions && message.suggestions.length > 0 && index === messages.length - 1 && (
                      <div className="mb-3 d-flex flex-wrap gap-2 ps-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            className="btn btn-sm btn-outline-success rounded-pill"
                            onClick={() => handleSuggestionClick(suggestion)}
                            style={{ fontSize: "12px" }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="mb-3 d-flex justify-content-start">
                    <div className="bg-white border shadow-sm p-3 rounded-3">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Initial Quick Replies */}
                {showQuickReplies && messages.length <= 1 && (
                  <div className="mt-3">
                    <small className="text-muted d-block mb-2 fw-bold">Quick questions:</small>
                    <div className="d-flex flex-wrap gap-2">
                      {quickReplies.map((reply, index) => (
                        <button
                          key={index}
                          className="btn btn-sm btn-outline-success rounded-pill shadow-sm"
                          onClick={() => handleQuickReply(reply.text)}
                          style={{ fontSize: "13px" }}
                        >
                          {reply.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="card-footer bg-white border-top" style={{ padding: "12px" }}>
                <div className="input-group">
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-control border-0 shadow-sm"
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    style={{ 
                      borderRadius: "20px 0 0 20px",
                      fontSize: "14px"
                    }}
                  />
                  <button
                    className="btn btn-success shadow-sm"
                    onClick={handleSendMessage}
                    disabled={inputMessage.trim() === ""}
                    style={{ 
                      borderRadius: "0 20px 20px 0",
                      minWidth: "50px"
                    }}
                  >
                    {inputMessage.trim() ? "📤" : "💬"}
                  </button>
                </div>
                <small className="text-muted d-block mt-1 text-center" style={{ fontSize: "10px" }}>
                  Press Enter to send • Powered by ❤️
                </small>
              </div>
            </>
          )}
        </div>
      )}

      {/* Enhanced Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #28a745;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .btn-outline-success:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }

        /* Scrollbar styling */
        .card-body::-webkit-scrollbar {
          width: 6px;
        }

        .card-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .card-body::-webkit-scrollbar-thumb {
          background: #28a745;
          border-radius: 10px;
        }

        .card-body::-webkit-scrollbar-thumb:hover {
          background: #20c997;
        }
      `}</style>
    </>
  );
}

export default EnhancedChatbot;