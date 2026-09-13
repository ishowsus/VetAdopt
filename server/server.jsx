require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// Endpoint to handle E-Wallet Checkout Sessions (GCash, Maya, GrabPay)
app.post("/create-ewallet-checkout", async (req, res) => {
  const { amount, paymentMethod, name, email } = req.body;

  // Map frontend wallet IDs to Stripe payment method types
  const paymentTypesMap = {
    gcash: ["gcash"],
    paymaya: ["card", "grabpay"], // Standard fallback or card integration for Maya
    grabpay: ["grabpay"],
    qrph: ["gcash", "paynow"],
  };

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentTypesMap[paymentMethod] || ["gcash"],
      line_items: [
        {
          price_data: {
            currency: "php",
            product_data: {
              name: "Pet Shelter Donation",
              description: `Donation by ${name}`,
            },
            unit_amount: Math.round(amount * 100), // Convert PHP to centavos
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      mode: "payment",
      success_url: "http://localhost:3000/donate?status=success",
      cancel_url: "http://localhost:3000/donate?status=cancel",
    });

    res.json({ redirectUrl: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`E-wallet backend running on port ${PORT}`));