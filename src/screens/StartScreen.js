// src/screens/StartScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  SportsBasketball, PlayArrow, CheckCircle,
  EmojiEvents, Whatshot, BarChart, ArrowForward,
  CalendarMonth, FitnessCenter, Lock,
  ChevronLeft, ChevronRight, MilitaryTech,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import { generateDailyPlan, formatDuration, getPlanDuration } from '../services/workoutService';
import './StartScreen.css';

const TIER_CONFIG = {
  free:       { label: 'Free',       color: '#718096' },
  pro:        { label: 'Pro',        color: '#00D4AA' },
  euroleague: { label: 'EuroLeague', color: '#FF5A1F' },
  nba:        { label: 'NBA',        color: '#667eea' },
};
const VALID_TIERS = ['free', 'pro', 'euroleague', 'nba'];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const WEEKLY_LEADERS = [
  { rank: 1, name: 'Jordan M.',  xp: 142, avatar: 'J', color: '#f5c842' },
  { rank: 2, name: 'Andrei P.',  xp: 118, avatar: 'A', color: '#C0C0C0' },
  { rank: 3, name: 'Marcus T.',  xp: 97,  avatar: 'M', color: '#cd7f32' },
  { rank: 4, name: 'Luca B.',    xp: 84,  avatar: 'L', color: '#667eea' },
  { rank: 5, name: 'Sasha K.',   xp: 71,  avatar: 'S', color: '#667eea' },
];

const PLAYERS = [
  { id: 'duane', name: 'Duane Washington Jr.', team: 'Partizan Belgrade', position: 'Guard', tier: 'euroleague', number: '7',  comingSoon: false },
  { id: 'cs1',   name: 'Coming Soon',          team: 'EuroLeague',         position: '—',    tier: 'euroleague', number: '?',  comingSoon: true  },
  { id: 'cs2',   name: 'Coming Soon',          team: 'NBA',                position: '—',    tier: 'nba',        number: '?',  comingSoon: true  },
];

// ── TierBadge ─────────────────────────────────────────────────────────────────
const TierBadge = ({ tier }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.free;
  return (
    <span className="sd-workout__tier-badge"
      style={{ background: `${cfg.color}22`, color: cfg.color, borderColor: `${cfg.color}44` }}>
      {cfg.label}
    </span>
  );
};

// ── SubcategoryBlock ──────────────────────────────────────────────────────────
const SubcategoryBlock = ({ sub, tierConfig, completedIds, onWorkoutPress }) => (
  <div className="sd-subcategory">
    <div className="sd-subcategory__header">
      <div className="sd-subcategory__title-row">
        <SportsBasketball className="sd-subcategory__icon" style={{ color: tierConfig.color }} />
        <h3 className="sd-subcategory__name">{sub.name}</h3>
      </div>
      <span className="sd-subcategory__count">{sub.workouts.length} exercises</span>
    </div>
    <div className="sd-exercise-list">
      {sub.workouts.map((w, i) => {
        const done = completedIds.includes(w.id);
        return (
          <div key={w.id || i} className={`sd-exercise ${done ? 'sd-exercise--done' : ''}`} onClick={() => onWorkoutPress(w)}>
            <div className="sd-exercise__index">
              {done ? <CheckCircle style={{ fontSize: '1rem', color: '#00D4AA' }} /> : String(i + 1).padStart(2, '0')}
            </div>
            <div className="sd-exercise__body">
              <span className="sd-exercise__title">{w.title}</span>
              <div className="sd-exercise__meta">
                <TierBadge tier={w.tier} />
                <span className="sd-exercise__dur">{w.duration} min</span>
              </div>
            </div>
            <button className={`sd-exercise__play ${done ? 'sd-exercise__play--done' : ''}`}
              onClick={e => { e.stopPropagation(); onWorkoutPress(w); }}>
              {done
                ? <CheckCircle className="sd-exercise__play-icon" style={{ color: '#00D4AA' }} />
                : <PlayArrow className="sd-exercise__play-icon" />}
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

// ── EmptyPlan ─────────────────────────────────────────────────────────────────
const EmptyPlan = ({ tier, navigate }) => (
  <div className="sd-empty-plan">
    <FitnessCenter className="sd-empty-plan__icon" />
    {tier === 'free' ? (
      <>
        <p className="sd-empty-plan__title">Upgrade to start training</p>
        <p className="sd-empty-plan__sub">Get access to daily workouts from pro athletes.</p>
        <button className="sd-cta-btn" onClick={() => navigate('/settings')}>
          See Plans <ArrowForward style={{ fontSize: 16 }} />
        </button>
      </>
    ) : (
      <>
        <p className="sd-empty-plan__title">No workouts loaded yet</p>
        <p className="sd-empty-plan__sub">Content is being uploaded. Check back soon.</p>
      </>
    )}
  </div>
);

// ── WeeklyLeaderboard ─────────────────────────────────────────────────────────
const WeeklyLeaderboard = ({ navigate }) => (
  <section className="sd-section">
    <div className="sd-section__header">
      <div className="sd-section__title-wrap">
        <MilitaryTech className="sd-section__icon" />
        <h2 className="sd-section__title">WEEKLY CHALLENGE</h2>
      </div>
      <button className="sd-section__link" onClick={() => navigate('/challenge')}>
        View all <ArrowForward style={{ fontSize: 14 }} />
      </button>
    </div>
    <div className="sd-leaderboard">
      {WEEKLY_LEADERS.map(p => (
        <div key={p.rank} className={`sd-leader ${p.rank === 1 ? 'sd-leader--first' : ''}`}>
          <span className="sd-leader__rank">
            {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
          </span>
          <div className="sd-leader__avatar" style={{ background: `${p.color}25`, color: p.color }}>
            {p.avatar}
          </div>
          <span className="sd-leader__name">{p.name}</span>
          <span className="sd-leader__xp">{p.xp} XP</span>
        </div>
      ))}
    </div>
  </section>
);

// ── PlayerCarousel ────────────────────────────────────────────────────────────
const PlayerCarousel = () => {
  const [idx, setIdx]   = useState(0);
  const trackRef        = useRef(null);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(PLAYERS.length - 1, i + 1));

  return (
    <section className="sd-section">
      <div className="sd-section__header">
        <div className="sd-section__title-wrap">
          <SportsBasketball className="sd-section__icon" />
          <h2 className="sd-section__title">YOUR COACHES</h2>
        </div>
        <div className="sd-carousel-nav">
          <button className="sd-carousel-btn" onClick={prev} disabled={idx === 0}>
            <ChevronLeft />
          </button>
          <button className="sd-carousel-btn" onClick={next} disabled={idx === PLAYERS.length - 1}>
            <ChevronRight />
          </button>
        </div>
      </div>

      <div className="sd-carousel-viewport">
        <div className="sd-carousel-track" ref={trackRef}
          style={{ transform: `translateX(calc(-${idx * 100}% - ${idx * 12}px))` }}>
          {PLAYERS.map(player => {
            const tierCfg = TIER_CONFIG[player.tier] || TIER_CONFIG.pro;
            return (
              <div key={player.id}
                className={`sd-player-card ${player.comingSoon ? 'sd-player-card--soon' : ''}`}
                style={{ borderColor: `${tierCfg.color}30` }}>
                <div className="sd-player-card__visual" style={{ background: `${tierCfg.color}10` }}>
                  {player.comingSoon
                    ? <Lock className="sd-player-card__lock" style={{ color: tierCfg.color, fontSize: '2rem' }} />
                    : <span className="sd-player-card__number" style={{ color: tierCfg.color }}>{player.number}</span>
                  }
                </div>
                <div className="sd-player-card__info">
                  <div className="sd-player-card__tier" style={{ background: `${tierCfg.color}20`, color: tierCfg.color }}>
                    {tierCfg.label}
                  </div>
                  <h3 className="sd-player-card__name">
                    {player.comingSoon ? 'Coming Soon' : player.name}
                  </h3>
                  <p className="sd-player-card__team">
                    {player.comingSoon ? 'New coach dropping soon' : `${player.team} · ${player.position}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sd-carousel-dots">
        {PLAYERS.map((_, i) => (
          <button key={i} className={`sd-carousel-dot ${i === idx ? 'sd-carousel-dot--active' : ''}`} onClick={() => setIdx(i)} />
        ))}
      </div>
    </section>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const StartScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData]           = useState(null);
  const [authUser, setAuthUser]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [planLoading, setPlanLoading]     = useState(false);
  const [dailyPlan, setDailyPlan]         = useState(null);
  const [completedIds, setCompletedIds]   = useState([]);
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
          const params = new URLSearchParams(location.search);
          const tierParam = params.get('tier');
          const isUpgraded = params.get('upgraded') === 'true';
          if (isUpgraded && tierParam && VALID_TIERS.includes(tierParam)) {
            await updateDoc(doc(db, 'users', user.uid), { tier: tierParam, updatedAt: new Date().toISOString() });
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

  useEffect(() => {
    if (!authUser) return;
    getDoc(doc(db, 'dailyPlans', `${authUser.uid}_${getTodayKey()}`)).then(snap => {
      if (snap.exists()) setCompletedIds(snap.data().completedWorkoutIds || []);
    });
  }, [authUser, location]);

  const handleSignOut     = async () => { await signOut(auth); navigate('/'); };
  const handleWorkoutPress = w => navigate(`/workout/${w.id}`, { state: { workout: w } });

  const firstName        = userData?.firstName || authUser?.email?.split('@')[0] || 'Athlete';
  const subscriptionTier = userData?.tier || 'free';
  const tierConfig       = TIER_CONFIG[subscriptionTier] || TIER_CONFIG.free;
  const position         = userData?.position || 'Guard';
  const today            = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const totalExercises   = dailyPlan?.subcategories?.reduce((sum, s) => sum + s.workouts.length, 0) ?? 0;
  const totalDuration    = dailyPlan ? formatDuration(getPlanDuration(dailyPlan)) : null;
  const doneCount        = completedIds.length;

  if (loading) return (
    <div className="sd-loading">
      <div className="sd-loading-logo">ATLAS</div>
      <div className="sd-loading-spinner" />
    </div>
  );

  return (
    <div className="sd-root">
      <div className="sd-bg">
        <div className="sd-glow sd-glow--1" />
        <div className="sd-glow sd-glow--2" />
        <div className="sd-grid" />
      </div>

      <Sidebar userData={userData} onSignOut={handleSignOut} />

      <div className="sb-content-wrap">
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
                  <span>Upgrade to access daily workouts from pro athletes.{' '}
                    <button className="sd-upgrade-link" onClick={() => navigate('/settings')}>See plans</button>
                  </span>
                ) : dailyPlan ? (
                  <span><strong>{doneCount}/{totalExercises} done</strong> · {totalDuration} total</span>
                ) : <span>Loading your plan for today…</span>}
              </p>
            </div>
            <div className="sd-tier-info">
              <div className="sd-tier-badge" style={{ background: `${tierConfig.color}18`, borderColor: `${tierConfig.color}40`, color: tierConfig.color }}>
                <SportsBasketball className="sd-tier-icon" />
                {tierConfig.label} Plan
              </div>
            </div>
          </section>

          {/* Today's Plan */}
          <section className="sd-section">
            <div className="sd-section__header">
              <div className="sd-section__title-wrap">
                <CalendarMonth className="sd-section__icon" />
                <h2 className="sd-section__title">TODAY'S PLAN</h2>
              </div>
              {dailyPlan && <span className="sd-section__meta">{position} · {dailyPlan.subcategories.length} blocks</span>}
            </div>
            {planLoading && (
              <div className="sd-plan-loading">
                <div className="sd-loading-spinner sd-loading-spinner--small" />
                <span>Building your plan…</span>
              </div>
            )}
            {!planLoading && dailyPlan && (
              <div className="sd-subcategory-list">
                {dailyPlan.subcategories.map(sub => (
                  <SubcategoryBlock key={sub.slug} sub={sub} tierConfig={tierConfig} completedIds={completedIds} onWorkoutPress={handleWorkoutPress} />
                ))}
              </div>
            )}
            {!planLoading && !dailyPlan && <EmptyPlan tier={subscriptionTier} navigate={navigate} />}
          </section>

          {/* Weekly Challenge Leaderboard */}
          <WeeklyLeaderboard navigate={navigate} />

          {/* Player Carousel */}
          <PlayerCarousel />

          {/* Stats */}
          <section className="sd-stats-row">
            <div className="sd-stat-card">
              <FitnessCenter className="sd-stat-card__icon" style={{ color: 'var(--orange)' }} />
              <span className="sd-stat-card__num">{doneCount}</span>
              <span className="sd-stat-card__label">Done Today</span>
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
              <span className="sd-stat-card__num">
                {totalExercises > 0 ? Math.round((doneCount / totalExercises) * 100) : 0}
                <span className="sd-stat-card__unit">%</span>
              </span>
              <span className="sd-stat-card__label">Day Progress</span>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default StartScreen;