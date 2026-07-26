// server/server.js
const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
const stripe = Stripe("YOUR_STRIPE_SECRET_KEY"); // Replace with your Stripe secret key

app.use(cors());
app.use(express.json());

app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body; // amount in PHP
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // convert to cents
      currency: "php",
      payment_method_types: ["card"],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(5000, () => console.log("Stripe server running on port 5000"));
