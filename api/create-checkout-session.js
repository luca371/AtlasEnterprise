// api/create-checkout-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_TO_TIER = {
  'price_1TSYP4253nJJ89FuHVuEVAPh': 'pro',
  'price_1TSYQF253nJJ89Fu4uZgVzP3': 'euroleague',
  'price_1TSYQt253nJJ89FuGifFwk97': 'nba',
};

const ALLOWED_PRICES = Object.keys(PRICE_TO_TIER);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { priceId, userId, email } = req.body;

  if (!priceId || !userId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!ALLOWED_PRICES.includes(priceId)) {
    return res.status(400).json({ error: 'Invalid price ID' });
  }

  const tier    = PRICE_TO_TIER[priceId];
  const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Tier inclus in URL — frontend il scrie direct in Firestore
      success_url: `${baseUrl}/start?upgraded=true&tier=${tier}`,
      cancel_url:  `${baseUrl}/settings`,
      metadata: { userId, tier },
      subscription_data: {
        metadata: { userId, tier },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};