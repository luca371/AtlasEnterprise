// api/create-checkout-session.js
// Vercel Serverless Function — creates a Stripe Checkout session
// Place this file at the root of your project: /api/create-checkout-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, userId, email } = req.body;

  if (!priceId || !userId || !email) {
    return res.status(400).json({ error: 'Missing required fields: priceId, userId, email' });
  }

  // Allowed price IDs — whitelist for security
  const ALLOWED_PRICES = [
    'price_1TSYP4253nJJ89FuHVuEVAPh', // Pro
    'price_1TSYQF253nJJ89Fu4uZgVzP3', // EuroLeague
    'price_1TSYQt253nJJ89FuGifFwk97', // NBA
  ];

  if (!ALLOWED_PRICES.includes(priceId)) {
    return res.status(400).json({ error: 'Invalid price ID' });
  }

  // Base URL — set APP_URL in Vercel environment variables
  const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/start?upgraded=true`,
      cancel_url:  `${baseUrl}/settings`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};