import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("YOUR_STRIPE_PUBLISHABLE_KEY"); // Replace with your Stripe publishable key

function DonateForm() {
  const [donorData, setDonorData] = useState({ name: "", email: "", amount: "", message: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleChange = (e) => setDonorData({ ...donorData, [e.target.name]: e.target.value });

  const handleSuggestedAmount = (amount) => setDonorData({ ...donorData, amount });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!donorData.name || !donorData.email || !donorData.amount) return alert("Please fill all required fields");

    setIsProcessing(true);
    try {
      // Request payment intent from backend
      const res = await fetch("http://localhost:5000/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: donorData.amount }),
      });
      const data = await res.json();
      const clientSecret = data.clientSecret;

      // Confirm card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: donorData.name, email: donorData.email },
        },
      });

      if (result.error) {
        alert(result.error.message);
      } else if (result.paymentIntent.status === "succeeded") {
        alert(`Thank you, ${donorData.name}! Your donation of ₱${donorData.amount} has been received. 🐾`);
        setDonorData({ name: "", email: "", amount: "", message: "" });
      }
    } catch (err) {
      alert(err.message);
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Suggested Amount Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
        {[100, 500, 1000].map((amt) => (
          <button
            type="button"
            key={amt}
            style={{
              flex: 1,
              margin: "0 5px",
              padding: "10px 0",
              borderRadius: "15px",
              border: "none",
              background: "#e8f5e9",
              color: "#2e7d32",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "0.3s",
            }}
            onClick={() => handleSuggestedAmount(amt)}
          >
            ₱{amt}
          </button>
        ))}
      </div>

      <input type="text" name="name" placeholder="Full Name" value={donorData.name} onChange={handleChange} required />
      <input type="email" name="email" placeholder="Email" value={donorData.email} onChange={handleChange} required />
      <input type="number" name="amount" placeholder="Donation Amount (₱)" value={donorData.amount} onChange={handleChange} required />
      <textarea name="message" placeholder="Message (optional)" value={donorData.message} onChange={handleChange}></textarea>

      <div style={{ padding: "12px 0", border: "1px solid #ccc", borderRadius: "8px", marginBottom: "15px" }}>
        <CardElement options={{ style: { base: { fontSize: "16px", color: "#2e7d32", "::placeholder": { color: "#555" } } } }} />
      </div>

      <button type="submit" disabled={!stripe || isProcessing} style={{ width: "100%", padding: "14px 0", background: "#2e7d32", color: "#fff", border: "none", borderRadius: "25px", fontWeight: "bold", cursor: "pointer", transition: "0.3s" }}>
        {isProcessing ? "Processing..." : "Donate Now"}
      </button>
    </form>
  );
}

export default function Donate() {
  return (
    <div style={{ maxWidth: "600px", margin: "80px auto", padding: "30px", background: "#fff", borderRadius: "15px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
      <h2 style={{ color: "#2e7d32", textAlign: "center" }}>Support Our Rescued Pets 🐾</h2>
      <p style={{ textAlign: "center", color: "#555" }}>Your contribution helps us rescue, care, and rehome animals in need.</p>
      <Elements stripe={stripePromise}>
        <DonateForm />
      </Elements>
    </div>
  );
}
