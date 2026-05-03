// src/screens/TodayTrainingScreen.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  SportsBasketball, PlayArrow, CheckCircle,
  FitnessCenter,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import { generateDailyPlan } from '../services/workoutService';
import './TodayTrainingScreen.css';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const TIER_CONFIG = {
  free:       { label: 'Free',       color: '#718096' },
  pro:        { label: 'Pro',        color: '#00D4AA' },
  euroleague: { label: 'EuroLeague', color: '#FF5A1F' },
  nba:        { label: 'NBA',        color: '#667eea' },
};

const TierBadge = ({ tier }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.free;
  return (
    <span className="tt-tier-badge"
      style={{ background: `${cfg.color}22`, color: cfg.color, borderColor: `${cfg.color}44` }}>
      {cfg.label}
    </span>
  );
};

const TodayTrainingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData]         = useState(null);
  const [authUser, setAuthUser]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [planLoading, setPlanLoading]   = useState(false);
  const [dailyPlan, setDailyPlan]       = useState(null);
  const [completedIds, setCompletedIds] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setUserData(snap.data());
      } catch (e) { /* continue */ }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!authUser || !userData) return;
    const tier = userData.tier || 'free';
    if (tier === 'free') return;
    setPlanLoading(true);
    generateDailyPlan(authUser.uid, tier)
      .then(async plan => {
        setDailyPlan(plan);
        const snap = await getDoc(doc(db, 'dailyPlans', `${authUser.uid}_${getTodayKey()}`));
        if (snap.exists()) setCompletedIds(snap.data().completedWorkoutIds || []);
      })
      .catch(console.error)
      .finally(() => setPlanLoading(false));
  }, [authUser, userData]);

  // Refresh completions on return from detail
  useEffect(() => {
    if (!authUser) return;
    getDoc(doc(db, 'dailyPlans', `${authUser.uid}_${getTodayKey()}`)).then(snap => {
      if (snap.exists()) setCompletedIds(snap.data().completedWorkoutIds || []);
    });
  }, [authUser, location]);

  const handleWorkoutPress = w => navigate(`/workout/${w.id}`, { state: { workout: w } });
  const handleSignOut = async () => { const { signOut } = await import('firebase/auth'); await signOut(auth); navigate('/'); };

  const subscriptionTier = userData?.tier || 'free';
  const tierConfig       = TIER_CONFIG[subscriptionTier] || TIER_CONFIG.free;
  const today            = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const totalExercises   = dailyPlan?.subcategories?.reduce((sum, s) => sum + s.workouts.length, 0) ?? 0;
  const doneCount        = completedIds.length;
  const progressPct      = totalExercises > 0 ? Math.round((doneCount / totalExercises) * 100) : 0;

  if (loading) return (
    <div className="tt-loading">
      <div className="tt-loading-logo">ATLAS</div>
      <div className="tt-spinner" />
    </div>
  );

  return (
    <div className="tt-root">
      <div className="tt-bg">
        <div className="tt-glow tt-glow--1" />
        <div className="tt-glow tt-glow--2" />
        <div className="tt-grid" />
      </div>

      <Sidebar userData={userData} onSignOut={handleSignOut} />

      <div className="sb-content-wrap">
        <main className="tt-main">

          {/* ── Header ── */}
          <div className="tt-header">
            <div>
              <span className="tt-header__date">{today}</span>
              <h1 className="tt-header__title">TODAY'S TRAINING</h1>
            </div>
            <div className="tt-header__badge" style={{ background: `${tierConfig.color}18`, borderColor: `${tierConfig.color}40`, color: tierConfig.color }}>
              <SportsBasketball style={{ fontSize: '1rem' }} />
              {tierConfig.label}
            </div>
          </div>

          {/* ── Progress bar ── */}
          {dailyPlan && (
            <div className="tt-progress-wrap">
              <div className="tt-progress-info">
                <span className="tt-progress-label">
                  <CheckCircle style={{ fontSize: '1rem', color: '#00D4AA', marginRight: 6 }} />
                  {doneCount} of {totalExercises} completed
                </span>
                <span className="tt-progress-pct" style={{ color: tierConfig.color }}>{progressPct}%</span>
              </div>
              <div className="tt-progress-bar">
                <div className="tt-progress-fill"
                  style={{ width: `${progressPct}%`, background: tierConfig.color }} />
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {planLoading && (
            <div className="tt-plan-loading">
              <div className="tt-spinner tt-spinner--sm" />
              <span>Building your plan…</span>
            </div>
          )}

          {/* ── Subcategories ── */}
          {!planLoading && dailyPlan && (
            <div className="tt-subcategory-list">
              {dailyPlan.subcategories.map((sub, si) => {
                const subDone = sub.workouts.every(w => completedIds.includes(w.id));
                return (
                  <div key={sub.slug} className="tt-subcategory">
                    {/* Section label */}
                    <div className="tt-sub-header">
                      <div className="tt-sub-header__left">
                        <div className="tt-sub-number" style={{ background: `${tierConfig.color}15`, color: tierConfig.color }}>
                          {String(si + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <h2 className="tt-sub-name">{sub.name}</h2>
                          <span className="tt-sub-count">{sub.workouts.length} exercises</span>
                        </div>
                      </div>
                      {subDone && (
                        <div className="tt-sub-done-badge">
                          <CheckCircle style={{ fontSize: '0.9rem' }} />
                          Done
                        </div>
                      )}
                    </div>

                    {/* Exercises */}
                    <div className="tt-exercise-grid">
                      {sub.workouts.map((w, i) => {
                        const done = completedIds.includes(w.id);
                        return (
                          <div key={w.id || i}
                            className={`tt-exercise-card ${done ? 'tt-exercise-card--done' : ''}`}
                            onClick={() => handleWorkoutPress(w)}
                          >
                            <div className="tt-exercise-card__top">
                              <span className="tt-exercise-card__num">
                                {done
                                  ? <CheckCircle style={{ fontSize: '1rem', color: '#00D4AA' }} />
                                  : String(i + 1).padStart(2, '0')
                                }
                              </span>
                              <button className={`tt-play-btn ${done ? 'tt-play-btn--done' : ''}`}
                                style={!done ? { background: tierConfig.color } : {}}
                                onClick={e => { e.stopPropagation(); handleWorkoutPress(w); }}>
                                {done
                                  ? <CheckCircle style={{ fontSize: '1.1rem', color: '#00D4AA' }} />
                                  : <PlayArrow style={{ fontSize: '1.1rem', color: '#fff' }} />
                                }
                              </button>
                            </div>
                            <div className="tt-exercise-card__body">
                              <p className="tt-exercise-card__title">{w.title}</p>
                              <div className="tt-exercise-card__meta">
                                <TierBadge tier={w.tier} />
                                <span className="tt-exercise-card__dur">{w.duration} min</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Free / empty state ── */}
          {!planLoading && !dailyPlan && (
            <div className="tt-empty">
              <FitnessCenter className="tt-empty__icon" />
              {subscriptionTier === 'free' ? (
                <>
                  <p className="tt-empty__title">Upgrade to access training</p>
                  <p className="tt-empty__sub">Get daily workouts built by pro athletes.</p>
                  <button className="tt-empty__btn" onClick={() => navigate('/settings')}>
                    See Plans
                  </button>
                </>
              ) : (
                <>
                  <p className="tt-empty__title">No workouts yet</p>
                  <p className="tt-empty__sub">Content is being uploaded. Check back soon.</p>
                </>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default TodayTrainingScreen;