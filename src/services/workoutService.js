// src/services/workoutService.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/**
 * Cumulative tier access.
 * Pro sees only Pro content.
 * EuroLeague sees Pro + EuroLeague content.
 * NBA sees everything.
 */
export const TIER_ACCESS = {
  pro:        ['pro'],
  euroleague: ['pro', 'euroleague'],
  nba:        ['pro', 'euroleague', 'nba'],
  free:       [],
};

/**
 * All subcategories available in Atlas.
 * slug  → used in Firestore documents
 * name  → displayed in the UI
 * icon  → MUI icon name suggestion for UI
 */
export const SUBCATEGORIES = [
  { slug: 'stretching',          name: 'Stretching',            icon: 'SelfImprovement'   },
  { slug: 'light_stretching',    name: 'Light Stretching',      icon: 'SelfImprovement'   },
  { slug: 'core_activation',     name: 'Core Activation',       icon: 'FitnessCenter'     },
  { slug: 'core_finisher',       name: 'Core Finisher',         icon: 'FitnessCenter'     },
  { slug: 'midrange_off_dribble',name: 'Midrange (Off Dribble)',icon: 'SportsBasketball'  },
  { slug: 'midrange',            name: 'Midrange',              icon: 'SportsBasketball'  },
  { slug: 'dribbling',           name: 'Dribbling',             icon: 'SportsBasketball'  },
  { slug: 'explosiveness',       name: 'Explosiveness',         icon: 'BoltRounded'       },
  { slug: 'finishing',           name: 'Finishing',             icon: 'SportsBasketball'  },
  { slug: 'mobility',            name: 'Mobility',              icon: 'AccessibilityNew'  },
  { slug: 'shooting',            name: 'Shooting',              icon: 'SportsBasketball'  },
  { slug: 'stamina',             name: 'Stamina',               icon: 'DirectionsRun'     },
  { slug: 'post_moves',          name: 'Post Moves',            icon: 'SportsBasketball'  },
  { slug: 'lower_body_strength', name: 'Lower Body Strength',   icon: 'FitnessCenter'     },
  { slug: 'upper_body_strength', name: 'Upper Body Strength',   icon: 'FitnessCenter'     },
  { slug: 'agility',             name: 'Agility',               icon: 'Speed'             },
  { slug: 'game_simulation',     name: 'Game Simulation',       icon: 'SportScore'        },
  { slug: 'clutch',              name: 'Clutch',                icon: 'EmojiEvents'       },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD string (local time). */
function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fisher-Yates shuffle — does not mutate original array. */
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Pick n random items from array. */
function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

// ─────────────────────────────────────────────
// WORKOUT DOCUMENT SHAPE (Firestore)
// ─────────────────────────────────────────────
//
// Collection: workouts
// Document ID: auto-generated
//
// {
//   title:        string,     e.g. "Drop Step Left + Finish"
//   subcategory:  string,     e.g. "post_moves"  (matches SUBCATEGORIES slug)
//   tier:         string,     "pro" | "euroleague" | "nba"
//   duration:     number,     seconds (≤ 10)
//   videoUrl:     string,     Firebase Storage URL or external URL
//   thumbnailUrl: string,     (optional) preview image URL
//   description:  string,     (optional) short coaching note
//   createdAt:    string,     ISO timestamp
// }

// ─────────────────────────────────────────────
// DAILY PLAN DOCUMENT SHAPE (Firestore)
// ─────────────────────────────────────────────
//
// Collection: dailyPlans
// Document ID: {userId}_{YYYY-MM-DD}
//
// {
//   userId:         string,
//   date:           string,     YYYY-MM-DD
//   tier:           string,     tier at generation time
//   generatedAt:    string,     ISO timestamp
//   subcategories: [
//     {
//       slug:     string,      e.g. "post_moves"
//       name:     string,      e.g. "Post Moves"
//       workouts: [
//         {
//           id:           string,
//           title:        string,
//           duration:     number,
//           tier:         string,
//           videoUrl:     string,
//           thumbnailUrl: string,
//           description:  string,
//         }
//       ]
//     }
//   ]
// }

// ─────────────────────────────────────────────
// CORE SERVICE FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Fetches workouts for a given subcategory accessible to the user's tier.
 * Returns all matching documents from Firestore.
 *
 * @param {string} subcategorySlug
 * @param {string[]} accessibleTiers - e.g. ['pro', 'euroleague']
 * @returns {Promise<Object[]>}
 */
async function fetchWorkoutsForSubcategory(subcategorySlug, accessibleTiers) {
  if (!accessibleTiers.length) return [];

  // Firestore 'in' operator supports max 10 values — safe here (max 3 tiers)
  const q = query(
    collection(db, 'workouts'),
    where('subcategory', '==', subcategorySlug),
    where('tier', 'in', accessibleTiers)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Generates (or retrieves cached) the daily plan for a user.
 *
 * Logic:
 *  1. Check dailyPlans/{userId}_{today} — return it if it exists.
 *  2. Determine which tiers the user can access.
 *  3. Pick 2–3 subcategories that have at least 1 workout available.
 *  4. For each subcategory, pick 4–5 random workouts.
 *  5. Persist to Firestore and return the plan.
 *
 * @param {string} userId
 * @param {string} userTier - "pro" | "euroleague" | "nba" | "free"
 * @returns {Promise<Object|null>} - the daily plan, or null if no content available
 */
export async function generateDailyPlan(userId, userTier) {
  const today = getTodayKey();
  const planId = `${userId}_${today}`;

  // ── 1. Return cached plan if it already exists ──
  const existing = await getDoc(doc(db, 'dailyPlans', planId));
  if (existing.exists()) {
    return existing.data();
  }

  // ── 2. Resolve accessible tiers ──
  const accessibleTiers = TIER_ACCESS[userTier] || [];
  if (!accessibleTiers.length) {
    // Free users get no plan
    return null;
  }

  // ── 3. Pick subcategories that have content ──
  //    Shuffle all subcategories, then pick the first N that return workouts.
  const shuffledSubs = shuffle(SUBCATEGORIES);
  const numSubcategories = Math.random() < 0.5 ? 2 : 3; // randomly 2 or 3

  const selectedSubcategories = [];

  for (const sub of shuffledSubs) {
    if (selectedSubcategories.length >= numSubcategories) break;

    const workoutsPool = await fetchWorkoutsForSubcategory(sub.slug, accessibleTiers);
    if (!workoutsPool.length) continue; // no videos yet for this sub — skip

    // ── 4. Pick 4–5 workouts per subcategory ──
    const numExercises = 4 + Math.floor(Math.random() * 2); // 4 or 5
    const selectedWorkouts = sample(workoutsPool, Math.min(numExercises, workoutsPool.length));

    selectedSubcategories.push({
      slug:     sub.slug,
      name:     sub.name,
      workouts: selectedWorkouts.map((w) => ({
        id:           w.id,
        title:        w.title,
        duration:     w.duration,
        tier:         w.tier,
        videoUrl:     w.videoUrl     || '',
        thumbnailUrl: w.thumbnailUrl || '',
        description:  w.description  || '',
      })),
    });
  }

  if (!selectedSubcategories.length) {
    // No workouts seeded yet — return null so UI can show empty state
    return null;
  }

  // ── 5. Persist and return ──
  const plan = {
    userId,
    date:           today,
    tier:           userTier,
    generatedAt:    new Date().toISOString(),
    subcategories:  selectedSubcategories,
  };

  await setDoc(doc(db, 'dailyPlans', planId), plan);
  return plan;
}

/**
 * Retrieves an existing daily plan without generating a new one.
 * Useful for read-only views (e.g., history).
 *
 * @param {string} userId
 * @param {string} dateKey - YYYY-MM-DD (defaults to today)
 * @returns {Promise<Object|null>}
 */
export async function getDailyPlan(userId, dateKey = getTodayKey()) {
  const snap = await getDoc(doc(db, 'dailyPlans', `${userId}_${dateKey}`));
  return snap.exists() ? snap.data() : null;
}

/**
 * Returns total duration of a daily plan in minutes.
 *
 * @param {Object} plan - result of generateDailyPlan
 * @returns {number}
 */
export function getPlanDuration(plan) {
  if (!plan?.subcategories) return 0;
  return plan.subcategories.reduce((total, sub) => {
    return total + sub.workouts.reduce((s, w) => s + (w.duration || 0), 0);
  }, 0);
}

/**
 * Formats minutes into a human-readable string.
 * e.g. 9 → "9 min"  |  75 → "1h 15 min"
 *
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m} min`;
}