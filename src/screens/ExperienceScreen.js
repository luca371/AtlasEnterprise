// src/screens/ExperienceScreen.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  WorkspacePremium, Psychology, FitnessCenter,
  EmojiEvents, DynamicFeed, Favorite,
  LockOpen, ArrowForward, CheckCircle,
  SportsBasketball,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import './ExperienceScreen.css';

const MILESTONES = [
  { xp: 100, label: '1 Month EuroLeague',  color: '#FF5A1F', bg: 'rgba(255,90,31,0.08)',   border: 'rgba(255,90,31,0.25)',   tier: 'euroleague' },
  { xp: 200, label: '1 Month NBA',          color: '#667eea', bg: 'rgba(102,126,234,0.08)', border: 'rgba(102,126,234,0.25)', tier: 'nba'        },
  { xp: 500, label: '1 Year EuroLeague + NBA', color: '#f5c842', bg: 'rgba(245,200,66,0.08)', border: 'rgba(245,200,66,0.25)', tier: 'both'      },
];

const EARN_WAYS = [
  { icon: <Psychology />,    color: '#f5c842',  label: 'Daily Basketball IQ',    desc: 'Answer correctly — up to 5 questions per day',          xp: '+1 per correct (max 5/day)' },
  { icon: <FitnessCenter />, color: '#00D4AA',  label: '1 Day of Training',       desc: 'Complete all workouts for the day',                      xp: '+3 XP'  },
  { icon: <EmojiEvents />,   color: '#FF5A1F',  label: 'Weekly Challenge Post',   desc: 'Submit your attempt to the weekly challenge',            xp: '+1 XP'  },
  { icon: <EmojiEvents />,   color: '#f5c842',  label: 'Win Weekly Challenge',    desc: 'Finish #1 in the weekly challenge leaderboard',          xp: '+10 XP' },
  { icon: <DynamicFeed />,   color: '#667eea',  label: 'Feed Post',               desc: 'Share a highlight — one post per day',                   xp: '+1 XP'  },
  { icon: <Favorite />,      color: '#ff6b6b',  label: 'Like 10 Posts',           desc: 'Show love to 10 community posts (cumulative)',           xp: '+3 XP'  },
  { icon: <SportsBasketball />, color: '#00D4AA', label: 'Daily Challenge',       desc: 'Complete the daily challenge',                           xp: '+1 XP'  },
];

const ExperienceScreen = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setUserData(snap.data());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  const handleSignOut = async () => { await signOut(auth); navigate('/'); };

  if (loading) {
    return (
      <div className="xp-loading">
        <div className="xp-loading-logo">ATLAS</div>
        <div className="xp-loading-spinner" />
      </div>
    );
  }

  const xp = userData?.xp || 0;

  // Next milestone
  const nextMilestone = MILESTONES.find((m) => xp < m.xp) || null;
  const prevMilestone = MILESTONES.filter((m) => xp >= m.xp).at(-1) || null;

  // Progress toward next milestone
  const progressFrom = prevMilestone ? prevMilestone.xp : 0;
  const progressTo   = nextMilestone ? nextMilestone.xp : MILESTONES.at(-1).xp;
  const progressPct  = nextMilestone
    ? Math.min(100, ((xp - progressFrom) / (progressTo - progressFrom)) * 100)
    : 100;

  return (
    <div className="xp-root">
      <div className="xp-bg">
        <div className="xp-glow xp-glow--1" />
        <div className="xp-glow xp-glow--2" />
        <div className="xp-grid" />
      </div>

      <Sidebar userData={userData} onSignOut={handleSignOut} />

      <div className="sb-content-wrap">
        <main className="xp-main">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="xp-header">
            <div className="xp-header__eyebrow">
              <WorkspacePremium className="xp-eyebrow-icon" />
              Your Progress
            </div>
            <h1 className="xp-header__title">EXPERIENCE POINTS</h1>
            <p className="xp-header__sub">Earn XP by training, competing, and engaging with the community.</p>
          </div>

          {/* ── XP Hero ─────────────────────────────────────────────── */}
          <div className="xp-hero">
            <div className="xp-hero__count">{xp}</div>
            <div className="xp-hero__label">XP</div>
            {nextMilestone ? (
              <div className="xp-hero__next">
                <span>{progressTo - xp} XP until</span>
                <strong style={{ color: nextMilestone.color }}>{nextMilestone.label}</strong>
              </div>
            ) : (
              <div className="xp-hero__next xp-hero__next--maxed">
                <CheckCircle style={{ fontSize: '1rem' }} />
                All milestones unlocked!
              </div>
            )}

            {/* Progress bar */}
            <div className="xp-hero__bar-wrap">
              <div className="xp-hero__bar">
                <div
                  className="xp-hero__bar-fill"
                  style={{
                    width: `${progressPct}%`,
                    background: nextMilestone?.color || '#f5c842',
                  }}
                />
              </div>
              <div className="xp-hero__bar-labels">
                <span>{progressFrom} XP</span>
                <span>{progressTo} XP</span>
              </div>
            </div>
          </div>

          {/* ── Milestones ───────────────────────────────────────────── */}
          <section className="xp-section">
            <div className="xp-section__label">Rewards</div>
            <h2 className="xp-section__title">XP MILESTONES</h2>

            <div className="xp-milestones">
              {MILESTONES.map((m) => {
                const unlocked = xp >= m.xp;
                const isCurrent = nextMilestone?.xp === m.xp;
                return (
                  <div
                    key={m.xp}
                    className={`xp-milestone ${unlocked ? 'xp-milestone--unlocked' : ''} ${isCurrent ? 'xp-milestone--current' : ''}`}
                    style={{ borderColor: unlocked || isCurrent ? m.border : undefined }}
                  >
                    <div className="xp-milestone__left">
                      <div
                        className="xp-milestone__badge"
                        style={{ background: m.bg, borderColor: m.border, color: m.color }}
                      >
                        {unlocked
                          ? <LockOpen style={{ fontSize: '1.1rem' }} />
                          : <WorkspacePremium style={{ fontSize: '1.1rem' }} />}
                      </div>
                      <div>
                        <div className="xp-milestone__name">{m.label}</div>
                        <div className="xp-milestone__req" style={{ color: m.color }}>
                          {m.xp} XP required
                        </div>
                      </div>
                    </div>
                    <div
                      className={`xp-milestone__status ${unlocked ? 'xp-milestone__status--unlocked' : ''}`}
                      style={unlocked ? { color: m.color, borderColor: m.border, background: m.bg } : {}}
                    >
                      {unlocked ? 'Unlocked' : `${m.xp - xp} XP away`}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── How to earn ──────────────────────────────────────────── */}
          <section className="xp-section">
            <div className="xp-section__label">Ways to Earn</div>
            <h2 className="xp-section__title">HOW TO EARN XP</h2>

            <div className="xp-earn-list">
              {EARN_WAYS.map((way, i) => (
                <div key={i} className="xp-earn-row">
                  <div className="xp-earn-row__icon" style={{ color: way.color, background: `${way.color}14`, border: `1px solid ${way.color}30` }}>
                    {way.icon}
                  </div>
                  <div className="xp-earn-row__info">
                    <div className="xp-earn-row__label">{way.label}</div>
                    <div className="xp-earn-row__desc">{way.desc}</div>
                  </div>
                  <div className="xp-earn-row__xp" style={{ color: way.color }}>
                    {way.xp}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA ──────────────────────────────────────────────────── */}
          <div className="xp-cta-row">
            <button className="xp-cta-btn xp-cta-btn--iq" onClick={() => navigate('/iq')}>
              <Psychology style={{ fontSize: '1rem' }} />
              Take Today's IQ Quiz
              <ArrowForward style={{ fontSize: '1rem' }} />
            </button>
            <button className="xp-cta-btn xp-cta-btn--start" onClick={() => navigate('/start')}>
              <FitnessCenter style={{ fontSize: '1rem' }} />
              Today's Training
            </button>
          </div>

        </main>
      </div>
    </div>
  );
};

export default ExperienceScreen;