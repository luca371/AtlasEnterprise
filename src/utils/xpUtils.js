// src/utils/xpUtils.js
// Central helper for awarding XP — import this wherever XP is granted.

import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Award XP to a user.
 * @param {string} uid   — Firebase auth UID
 * @param {number} amount — XP to add (positive integer)
 */
export const awardXP = async (uid, amount) => {
  if (!uid || !amount || amount <= 0) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      xp: increment(amount),
    });
  } catch (e) {
    console.error('awardXP error:', e);
  }
};

/**
 * Check the 'like 10 posts = 3 XP' milestone and award if hit.
 * Call this after a user likes a post.
 * @param {string} uid
 */
export const checkLikeMilestone = async (uid) => {
  if (!uid) return;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    const data = snap.data();
    const given     = (data.likesGivenCount    || 0) + 1;
    const milestones = data.likesGivenMilestone || 0;
    const newMilestone = Math.floor(given / 10);

    const updates = { likesGivenCount: increment(1) };
    if (newMilestone > milestones) {
      updates.xp = increment(3 * (newMilestone - milestones));
      updates.likesGivenMilestone = newMilestone;
    }
    await updateDoc(doc(db, 'users', uid), updates);
  } catch (e) {
    console.error('checkLikeMilestone error:', e);
  }
};