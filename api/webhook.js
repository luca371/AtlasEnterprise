// api/webhook.js
// Vercel Serverless Function — handles Stripe webhook events
// Place this file at the root of your project: /api/webhook.js
//
// SETUP REQUIRED:
// 1. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
//    URL: https://your-app.vercel.app/api/webhook
//    Events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated
// 2. Copy the "Signing secret" (whsec_...) → add as STRIPE_WEBHOOK_SECRET in Vercel env vars
// 3. Go to Firebase Console → Project Settings → Service Accounts → Generate new private key
//    Copy the JSON content → add as FIREBASE_SERVICE_ACCOUNT in Vercel env vars (as a string)
// 4. Run: npm install stripe firebase-admin

const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin   = require('firebase-admin');

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      ),
    });
  } catch (e) {
    console.error('Firebase Admin init error:', e.message);
  }
}

const db = admin.firestore();

// Map Stripe Price IDs to Atlas tiers
const PRICE_TO_TIER = {
  'price_1TSYP4253nJJ89FuHVuEVAPh': 'pro',
  'price_1TSYQF253nJJ89Fu4uZgVzP3': 'euroleague',
  'price_1TSYQt253nJJ89FuGifFwk97': 'nba',
};

// Read raw body (required for Stripe signature verification)
const getRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end',  ()      => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

// Disable Vercel's default body parser so we get the raw stream
module.exports.config = {
  api: { bodyParser: false },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify Stripe signature
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Handle events ────────────────────────────────────────────────────────
  try {
    // Payment successful — update user tier in Firestore
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId  = session.metadata?.userId;

      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId      = subscription.items.data[0]?.price?.id;
        const tier         = PRICE_TO_TIER[priceId] || 'pro';

        await db.collection('users').doc(userId).update({
          tier,
          stripeCustomerId:     session.customer,
          stripeSubscriptionId: session.subscription,
          updatedAt:            new Date().toISOString(),
        });

        console.log(`User ${userId} upgraded to ${tier}`);
      }
    }

    // Subscription cancelled — revert to free
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      const snapshot = await db.collection('users')
        .where('stripeCustomerId', '==', subscription.customer)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        await snapshot.docs[0].ref.update({
          tier:                 'free',
          stripeSubscriptionId: null,
          updatedAt:            new Date().toISOString(),
        });
        console.log(`Customer ${subscription.customer} reverted to free`);
      }
    }

    // Subscription changed (e.g., upgrade/downgrade via Stripe portal)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const priceId      = subscription.items.data[0]?.price?.id;
      const tier         = PRICE_TO_TIER[priceId];

      if (tier) {
        const snapshot = await db.collection('users')
          .where('stripeCustomerId', '==', subscription.customer)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            tier,
            updatedAt: new Date().toISOString(),
          });
          console.log(`Customer ${subscription.customer} plan updated to ${tier}`);
        }
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  return res.json({ received: true });
};