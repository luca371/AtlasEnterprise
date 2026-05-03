// src/scripts/seedWorkouts.js
//
// ─────────────────────────────────────────────────────────
// HOW TO RUN
// ─────────────────────────────────────────────────────────
// This is a one-time script you run from the browser console
// or as a standalone Node.js script (with firebase-admin).
//
// EASIEST — Run directly in browser console on /start:
//   1. Open your Atlas app and log in
//   2. Open DevTools → Console
//   3. Paste the entire content of this file and press Enter
//   4. Call: await seedWorkouts()
//   5. Check Firebase Console → Firestore → workouts collection
//
// It seeds 5 workout documents per subcategory per tier =
// 18 subcategories × 3 tiers × 5 workouts = 270 documents total.
// ─────────────────────────────────────────────────────────

import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';

// ── Seed data: real exercises per subcategory ─────────────

const SEED_EXERCISES = {
  stretching: [
    { title: 'Shoulder + Chest Stretch',       duration: 8  },
    { title: 'Hip Flexor Hold',                duration: 10 },
    { title: 'Hamstring Stretch (both legs)',   duration: 10 },
    { title: 'Quad Pull Standing',             duration: 8  },
    { title: 'Upper Back Reach + Hold',        duration: 8  },
    { title: 'Calf Stretch Wall',              duration: 7  },
    { title: 'Spine Twist Seated',             duration: 8  },
  ],
  light_stretching: [
    { title: 'Deep Breath + Spine Release',    duration: 6  },
    { title: 'Hamstring Easy Hold',            duration: 8  },
    { title: 'Hip Circle Slow',                duration: 7  },
    { title: 'Ankle Roll Out',                 duration: 6  },
    { title: 'Child\'s Pose Hold',             duration: 10 },
  ],
  core_activation: [
    { title: 'Plank Hold',                     duration: 10 },
    { title: 'Dead Bug (10 reps per side)',     duration: 10 },
    { title: 'Glute Bridge (12 reps)',          duration: 9  },
    { title: 'Lateral Plank (20s per side)',    duration: 10 },
    { title: 'Bird Dog Hold',                  duration: 9  },
    { title: 'Mountain Climbers',              duration: 8  },
  ],
  core_finisher: [
    { title: 'Leg Raises (12 reps)',           duration: 9  },
    { title: 'Russian Twists (20 reps)',       duration: 8  },
    { title: 'V-Ups (12 reps)',                duration: 8  },
    { title: 'Plank to Failure',               duration: 10 },
    { title: 'Flutter Kicks (30s)',            duration: 10 },
  ],
  midrange_off_dribble: [
    { title: 'Baseline Left Pull-Up',          duration: 8  },
    { title: '45° Left Pull-Up',               duration: 8  },
    { title: 'Top Key Pull-Up',                duration: 8  },
    { title: '45° Right Pull-Up',              duration: 8  },
    { title: 'Baseline Right Pull-Up',         duration: 8  },
    { title: 'Elbow Jumper Off 1 Dribble',     duration: 9  },
  ],
  midrange: [
    { title: 'Catch & Shoot (self toss)',      duration: 8  },
    { title: 'Stepback Left',                  duration: 9  },
    { title: 'Sidestep Right',                 duration: 9  },
    { title: 'Mid Fadeaway Off Screen',        duration: 9  },
    { title: 'Elbow Jumper Stationary',        duration: 8  },
    { title: 'Pull-Up Off 2 Dribbles',         duration: 9  },
  ],
  dribbling: [
    { title: 'Low Dribble Control (30s/hand)', duration: 10 },
    { title: 'Fast Crossovers (30s)',          duration: 10 },
    { title: 'Between the Legs (30s)',         duration: 10 },
    { title: 'Behind the Back (30s)',          duration: 10 },
    { title: 'Crossover + Drive (2 steps)',    duration: 9  },
    { title: 'Hesitation + Drive',             duration: 9  },
    { title: 'Combo: Cross → Between → Drive', duration: 10 },
    { title: 'Freestyle Game Speed',           duration: 10 },
  ],
  explosiveness: [
    { title: 'Squat Jumps (10 reps)',          duration: 9  },
    { title: 'Lateral Bounds (8/side)',        duration: 9  },
    { title: 'Broad Jumps (8 reps)',           duration: 9  },
    { title: 'Split Jumps (8/side)',           duration: 9  },
    { title: 'Depth Drop + Explode',           duration: 8  },
    { title: 'Box Jump Continuous',            duration: 10 },
  ],
  finishing: [
    { title: 'Mikan Drill (normal)',           duration: 8  },
    { title: 'Reverse Layup Left',             duration: 8  },
    { title: 'Floater Left',                   duration: 8  },
    { title: 'Euro Step Left',                 duration: 9  },
    { title: 'Spin Move + Finish',             duration: 9  },
    { title: 'Power Layup Both Sides',         duration: 9  },
    { title: 'Finger Roll Off Glass',          duration: 8  },
  ],
  mobility: [
    { title: 'Deep Squat Hold',                duration: 10 },
    { title: 'Hip Flexor Stretch',             duration: 9  },
    { title: 'Ankle Mobility Drill',           duration: 8  },
    { title: 'Hamstring Walkout',              duration: 9  },
    { title: 'Thoracic Rotation',              duration: 8  },
    { title: 'Pigeon Pose Hold',               duration: 10 },
  ],
  shooting: [
    { title: 'Corner 3PT Catch & Shoot',       duration: 8  },
    { title: 'Wing 3PT Off Dribble',           duration: 9  },
    { title: 'Top 3PT Stationary',             duration: 8  },
    { title: 'Step-In 3PT After Sprint',       duration: 9  },
    { title: '5-Spot Shooting (1 make/spot)',  duration: 10 },
    { title: 'Free Throw Routine (5 reps)',    duration: 9  },
    { title: 'Pull-Up 3PT Off Hesitation',     duration: 9  },
  ],
  stamina: [
    { title: 'Suicides Baseline–Baseline (5)', duration: 10 },
    { title: 'Shuttle Sprint 10–15m (6 reps)', duration: 9  },
    { title: 'Full Court Layup + Sprint Back', duration: 9  },
    { title: 'Sprint 15m × 5',                duration: 8  },
    { title: '17s Sprint Drill',               duration: 10 },
    { title: 'Direction Change Sprints',       duration: 9  },
  ],
  post_moves: [
    { title: 'Drop Step Left + Finish',        duration: 9  },
    { title: 'Drop Step Right + Finish',       duration: 9  },
    { title: 'Hook Shot Left',                 duration: 8  },
    { title: 'Hook Shot Right',                duration: 8  },
    { title: 'Up & Under Left',                duration: 9  },
    { title: 'Spin Move + Finish (both)',       duration: 9  },
    { title: 'Fake Shot → Baseline Drive',     duration: 9  },
    { title: 'Fake Shot → Spin → Finish',      duration: 10 },
  ],
  lower_body_strength: [
    { title: 'Slow Squats (15 reps)',          duration: 9  },
    { title: 'Jump Squats (10 reps)',          duration: 8  },
    { title: 'Forward Lunges (10/side)',       duration: 9  },
    { title: 'Lateral Lunges (10/side)',       duration: 9  },
    { title: 'Glute Bridge (15 reps)',         duration: 8  },
    { title: 'Single-Leg Hops (10/side)',      duration: 8  },
  ],
  upper_body_strength: [
    { title: 'Push-Up Variation (15 reps)',    duration: 8  },
    { title: 'Resistance Band Pull-Apart',     duration: 8  },
    { title: 'Shoulder Press (dumbbells)',     duration: 9  },
    { title: 'Tricep Dips (12 reps)',          duration: 8  },
    { title: 'Wrist + Forearm Curl',           duration: 7  },
    { title: 'Band Chest Press',              duration: 8  },
  ],
  agility: [
    { title: 'Ladder: 1-In (2 passes)',        duration: 8  },
    { title: 'Ladder: 2-In (2 passes)',        duration: 8  },
    { title: 'Ladder: In-Out Rapid',           duration: 8  },
    { title: 'Hurdle Sprint (3–5)',            duration: 8  },
    { title: 'Lateral Hurdle Hops (6/side)',   duration: 8  },
    { title: 'Zig-Zag Cone Drill',             duration: 9  },
    { title: 'Defensive Slides Full Court',    duration: 10 },
  ],
  game_simulation: [
    { title: 'Read & React: Shoot/Drive/Pull-Up', duration: 10 },
    { title: 'Attack Closeout (quick decision)',   duration: 9  },
    { title: '1v0 Full Possession Off Dribble',    duration: 10 },
    { title: 'Pick & Roll Read: Shoot/Pass/Drive', duration: 10 },
    { title: 'Defensive Stance Hold (isometric)',  duration: 9  },
    { title: 'Closeout + Contest Imaginary',       duration: 8  },
  ],
  clutch: [
    { title: '3PT / Mid "Make or Move"',       duration: 9  },
    { title: '5 Spot Consecutive Makes',       duration: 10 },
    { title: 'Game-Winner Sim (1–2 dribbles)', duration: 9  },
    { title: 'Free Throw Under Pressure',      duration: 8  },
    { title: 'Last 5s Isolation Play',         duration: 9  },
  ],
};

// Per-tier coaching notes — same exercise, different difficulty context
const TIER_NOTES = {
  pro:        'Focus on form and consistency.',
  euroleague: 'Add game speed. Push intensity.',
  nba:        'Elite pace. Replicate game conditions exactly.',
};

// ── Main seed function ────────────────────────────────────

export async function seedWorkouts() {
  // Safety check: don't re-seed if workouts already exist
  const existing = await getDocs(query(collection(db, 'workouts'), limit(1)));
  if (!existing.empty) {
    console.warn('⚠️  Workouts collection already has data. Skipping seed.');
    console.warn('    Delete the collection first if you want to re-seed.');
    return;
  }

  const tiers = ['pro', 'euroleague', 'nba'];
  let count = 0;

  for (const [subcategorySlug, exercises] of Object.entries(SEED_EXERCISES)) {
    for (const tier of tiers) {
      // Take first 5 exercises for each tier (enough to demo randomness)
      const tierExercises = exercises.slice(0, 5);

      for (const exercise of tierExercises) {
        await addDoc(collection(db, 'workouts'), {
          title:        exercise.title,
          subcategory:  subcategorySlug,
          tier,
          duration:     exercise.duration,
          videoUrl:     '',      // replace with real URL when uploading videos
          thumbnailUrl: '',      // replace with real URL
          description:  TIER_NOTES[tier],
          createdAt:    new Date().toISOString(),
        });
        count++;
      }
    }
  }

  console.log(`✅ Seeded ${count} workout documents across ${tiers.length} tiers.`);
}

// ─────────────────────────────────────────────────────────
// FIRESTORE SECURITY RULES (paste in Firebase Console)
// ─────────────────────────────────────────────────────────
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//
//     // Users can read/write their own document
//     match /users/{userId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//
//     // Daily plans: users can only read/create their own
//     match /dailyPlans/{planId} {
//       allow read, create: if request.auth != null
//         && planId.matches(request.auth.uid + '_.*');
//       allow update, delete: if false; // plans are immutable once created
//     }
//
//     // Workouts: any authenticated user can read
//     // Only admins write (done via Admin SDK or seeding script)
//     match /workouts/{workoutId} {
//       allow read: if request.auth != null;
//       allow write: if false; // disable client-side writes
//     }
//   }
// }