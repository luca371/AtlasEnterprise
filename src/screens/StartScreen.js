// src/screens/StartScreen.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  SportsBasketball, PlayArrow, CheckCircle, RadioButtonUnchecked,
  LockOpen, Lock, EmojiEvents, Whatshot, BarChart, ArrowForward,
  CalendarMonth, FitnessCenter,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import './StartScreen.css';

const TIER_CONFIG = {
  free:       { label: 'Free',       color: '#718096' },
  pro:        { label: 'Pro',        color: '#00D4AA' },
  euroleague: { label: 'EuroLeague', color: '#FF5A1F' },
  nba:        { label: 'NBA',        color: '#667eea' },
};

const VALID_TIERS = ['free', 'pro', 'euroleague', 'nba'];

const todayPlan = [
  { label: 'Ball Handling Fundamentals',   duration: '15 min', category: 'Ball Handling', done: false, active: true },
  { label: 'Shooting off the Dribble',     duration: '20 min', category: 'Shooting',      done: false },
  { label: 'Strength & Conditioning',      duration: '25 min', category: 'Strength',      done: false },
  { label: 'Court IQ — Pick & Roll Reads', duration: '10 min', category: 'Court IQ',      done: false },
  { label: 'Mid Range Pull-Up Drill',      duration: '15 min', category: 'Mid Range',     done: false },
  { label: 'Defensive Footwork',           duration: '10 min', category: 'Stamina',       done: false },
  { label: 'Post Up Moves Series',         duration: '20 min', category: 'Post Up',       done: false },
];

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const DayIcon = ({ done, active }) => {
  if (done)   return <CheckCircle        className="sd-day-icon sd-day-icon--done" />;
  if (active) return <PlayArrow          className="sd-day-icon sd-day-icon--active" />;
  return        <RadioButtonUnchecked    className="sd-day-icon sd-day-icon--upcoming" />;
};

const StartScreen = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [userData, setUserData]           = useState(null);
  const [authUser, setAuthUser]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activeDay, setActiveDay]         = useState(2);
  const [upgradeBanner, setUpgradeBanner] = useState(false);
  const [upgradedTier, setUpgradedTier]   = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          let data = snap.data();

          const params    = new URLSearchParams(location.search);
          const tierParam = params.get('tier');
          const isUpgraded = params.get('upgraded') === 'true';

          if (isUpgraded && tierParam && VALID_TIERS.includes(tierParam)) {
            await updateDoc(doc(db, 'users', user.uid), {
              tier: tierParam,
              updatedAt: new Date().toISOString(),
            });
            data = { ...data, tier: tierParam };
            setUpgradedTier(tierParam);
            setUpgradeBanner(true);
            setTimeout(() => setUpgradeBanner(false), 5000);
          }

          setUserData(data);
        }
      } catch (e) { /* continue */ }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate, location.search]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const firstName        = userData?.firstName || authUser?.email?.split('@')[0] || 'Athlete';
  const subscriptionTier = userData?.tier || 'free';
  const tierConfig       = TIER_CONFIG[subscriptionTier] || TIER_CONFIG.free;
  const position         = userData?.position || 'Guard';
  const today            = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="sd-loading">
        <div className="sd-loading-logo">ATLAS</div>
        <div className="sd-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="sd-root">
      <div className="sd-bg">
        <div className="sd-glow sd-glow--1" />
        <div className="sd-glow sd-glow--2" />
        <div className="sd-grid" />
      </div>

      {/* Sidebar */}
      <Sidebar userData={userData} onSignOut={handleSignOut} />

      {/* Content wrap — offset for sidebar */}
      <div className="sb-content-wrap">

        {/* Upgrade banner */}
        {upgradeBanner && (
          <div className="sd-upgrade-banner">
            <CheckCircle className="sd-upgrade-banner__icon" />
            Plan upgraded to {TIER_CONFIG[upgradedTier]?.label}. Welcome!
          </div>
        )}

        <main className="sd-main">

          {/* Welcome */}
          <section className="sd-welcome">
            <div className="sd-welcome__text">
              <span className="sd-welcome__date">{today}</span>
              <h1 className="sd-welcome__title">
                READY TO WORK,<br />
                <span className="sd-accent">{firstName.toUpperCase()}?</span>
              </h1>
              <p className="sd-welcome__sub">
                {subscriptionTier === 'free' ? (
                  <span>
                    You have <strong>3 training days</strong> this week (Mon, Wed, Fri).{' '}
                    <button className="sd-upgrade-link" onClick={() => navigate('/settings')}>
                      Upgrade for daily access
                    </button>
                  </span>
                ) : (
                  <span>You have <strong>7 workouts</strong> lined up today. Complete the full week to unlock them.</span>
                )}
              </p>
            </div>

            {/* Tier badge */}
            <div className="sd-tier-info">
              <div
                className="sd-tier-badge"
                style={{
                  background:  `${tierConfig.color}18`,
                  borderColor: `${tierConfig.color}40`,
                  color:        tierConfig.color,
                }}
              >
                <SportsBasketball className="sd-tier-icon" />
                {tierConfig.label} Plan
              </div>
            </div>

            {/* Week tracker */}
            <div className="sd-week-tracker">
              <span className="sd-week-label">THIS WEEK</span>
              <div className="sd-week-days">
                {weekDays.map((d, i) => {
                  const isLocked = subscriptionTier === 'free' && i !== 0 && i !== 2 && i !== 4;
                  return (
                    <div
                      key={i}
                      className={`sd-week-day ${i < activeDay ? 'sd-week-day--done' : i === activeDay ? 'sd-week-day--active' : ''} ${isLocked ? 'sd-week-day--locked' : ''}`}
                      onClick={() => !isLocked && setActiveDay(i)}
                    >
                      <span className="sd-week-day__letter">{d}</span>
                      {i < activeDay
                        ? <CheckCircle className="sd-week-day__check" />
                        : isLocked
                        ? <Lock className="sd-week-day__lock" />
                        : <span className="sd-week-day__num">{i + 1}</span>
                      }
                    </div>
                  );
                })}
              </div>
              <div className="sd-week-progress">
                <div className="sd-week-progress__bar" style={{ width: `${(activeDay / 7) * 100}%` }} />
              </div>
              <div className="sd-week-unlock">
                {activeDay < 7
                  ? <><Lock className="sd-unlock-icon" /> Complete {7 - activeDay} more day{7 - activeDay !== 1 ? 's' : ''} to unlock your library</>
                  : <><LockOpen className="sd-unlock-icon sd-unlock-icon--open" /> Week complete — library unlocked!</>
                }
              </div>
            </div>
          </section>

          {/* Today's workouts */}
          <section className="sd-section">
            <div className="sd-section__header">
              <div className="sd-section__title-wrap">
                <CalendarMonth className="sd-section__icon" />
                <h2 className="sd-section__title">TODAY'S PLAN</h2>
              </div>
              <span className="sd-section__meta">{position} · {todayPlan.length} sessions</span>
            </div>

            <div className="sd-workout-list">
              {todayPlan.map((w, i) => (
                <div key={i} className={`sd-workout ${w.active ? 'sd-workout--active' : ''} ${w.done ? 'sd-workout--done' : ''}`}>
                  <div className="sd-workout__check"><DayIcon done={w.done} active={w.active} /></div>
                  <div className="sd-workout__body">
                    <span className="sd-workout__label">{w.label}</span>
                    <div className="sd-workout__meta">
                      <span className="sd-workout__cat">{w.category}</span>
                      <span className="sd-workout__dur">{w.duration}</span>
                    </div>
                  </div>
                  <button className="sd-workout__btn">
                    {w.active ? 'Start' : 'View'} <ArrowForward className="sd-workout__arrow" />
                  </button>
                </div>
              ))}
            </div>

            <div className="sd-unlock-hint">
              <LockOpen className="sd-hint-icon" />
              <span>Finish all 7 days this week to unlock every workout permanently to your library</span>
            </div>
          </section>

          {/* Quick stats */}
          <section className="sd-stats-row">
            <div className="sd-stat-card">
              <FitnessCenter className="sd-stat-card__icon" style={{ color: 'var(--orange)' }} />
              <span className="sd-stat-card__num">0</span>
              <span className="sd-stat-card__label">Workouts Done</span>
            </div>
            <div className="sd-stat-card">
              <Whatshot className="sd-stat-card__icon" style={{ color: '#ff9800' }} />
              <span className="sd-stat-card__num">0</span>
              <span className="sd-stat-card__label">Day Streak</span>
            </div>
            <div className="sd-stat-card">
              <EmojiEvents className="sd-stat-card__icon" style={{ color: 'var(--gold)' }} />
              <span className="sd-stat-card__num">0</span>
              <span className="sd-stat-card__label">Badges Earned</span>
            </div>
            <div className="sd-stat-card">
              <BarChart className="sd-stat-card__icon" style={{ color: 'var(--teal)' }} />
              <span className="sd-stat-card__num">0<span className="sd-stat-card__unit">%</span></span>
              <span className="sd-stat-card__label">Week Progress</span>
            </div>
          </section>

          {/* Ambassador spotlight */}
          <section className="sd-ambassador">
            <div className="sd-ambassador__inner">
              <div className="sd-ambassador__text">
                <span className="sd-ambassador__eyebrow">Your Coach</span>
                <h3 className="sd-ambassador__name">DUANE WASHINGTON JR.</h3>
                <p className="sd-ambassador__team">Partizan Belgrade · Guard</p>
                <blockquote className="sd-ambassador__quote">
                  "Every rep in practice is a rep closer to the big stage."
                </blockquote>
                <div className="sd-ambassador__tier">
                  <span className="sd-amb-tier-badge">EuroLeague Tier</span>
                </div>
              </div>
              <div className="sd-ambassador__number">7</div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default StartScreen;