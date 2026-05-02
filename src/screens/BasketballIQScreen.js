// src/screens/BasketballIQScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  Psychology,
  CheckCircle,
  Cancel,
  EmojiEvents,
  LockOutlined,
  ArrowForward,
  WorkspacePremium,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import QUESTIONS from '../data/questionsData';
import './BasketballIQScreen.css';

const TIER_ORDER = { free: 0, pro: 1, euroleague: 2, nba: 3 };
const isPro = (tier) => TIER_ORDER[tier] >= TIER_ORDER['pro'];
const QUESTIONS_PER_DAY = 5;

// Seeded pseudo-random using date string + uid for reproducibility
const seededShuffle = (arr, seed) => {
  const s = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  for (let i = s.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0;
    const j = Math.abs(h) % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
};

const todayStr = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

const BasketballIQScreen = () => {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading]   = useState(true);

  // Quiz state
  const [phase, setPhase]             = useState('intro');   // intro | quiz | result
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [selected, setSelected]       = useState(null);      // option index chosen
  const [revealed, setRevealed]       = useState(false);     // show correct/wrong
  const [answers, setAnswers]         = useState([]);        // { questionId, correct }
  const [xpEarned, setXpEarned]       = useState(0);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  // Load user + check if played today
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          if (data.iqLastPlayed === todayStr()) setAlreadyPlayed(true);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  // Pick today's 5 questions — seeded by date + uid so they're stable all day
  const todayQuestions = useMemo(() => {
    if (!authUser) return [];
    const seed = `${todayStr()}-${authUser.uid}`;
    return seededShuffle(QUESTIONS, seed).slice(0, QUESTIONS_PER_DAY);
  }, [authUser]);

  const currentQ = todayQuestions[currentIdx];

  // Shuffle answer options once per question (stable)
  const shuffledOpts = useMemo(() => {
    if (!currentQ) return [];
    // Build array of {text, isCorrect}
    const opts = currentQ.opts.map((text, i) => ({ text, isCorrect: i === currentQ.answer }));
    // Shuffle using question id as seed
    return seededShuffle(opts, `${todayStr()}-q${currentQ.id}`);
  }, [currentQ]);

  const handleSignOut = async () => { await signOut(auth); navigate('/'); };

  const handleSelect = (optIdx) => {
    if (revealed) return;
    setSelected(optIdx);
    setRevealed(true);
  };

  const handleNext = async () => {
    const isCorrect = shuffledOpts[selected]?.isCorrect ?? false;
    const newAnswers = [...answers, { questionId: currentQ.id, correct: isCorrect }];
    setAnswers(newAnswers);
    setSelected(null);
    setRevealed(false);

    if (currentIdx + 1 < QUESTIONS_PER_DAY) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // End of quiz — calculate XP
      const correctCount = newAnswers.filter((a) => a.correct).length;
      const xp = correctCount; // 1 XP per correct answer, max 5

      setXpEarned(xp);
      setPhase('result');

      // Persist to Firestore
      if (authUser) {
        try {
          await updateDoc(doc(db, 'users', authUser.uid), {
            xp:          increment(xp),
            iqLastPlayed: todayStr(),
          });
        } catch (e) { console.error('XP save error:', e); }
      }
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="iq-loading">
        <div className="iq-loading-logo">ATLAS</div>
        <div className="iq-loading-spinner" />
      </div>
    );
  }

  const tier   = userData?.tier || 'free';
  const userXP = userData?.xp   || 0;

  // ── Upgrade gate ───────────────────────────────────────────────────────────
  if (!isPro(tier)) {
    return (
      <div className="iq-root">
        <div className="iq-bg"><div className="iq-glow iq-glow--1" /><div className="iq-glow iq-glow--2" /><div className="iq-grid" /></div>
        <Sidebar userData={userData} onSignOut={handleSignOut} />
        <div className="sb-content-wrap">
          <main className="iq-main">
            <div className="iq-gate">
              <div className="iq-gate__icon"><LockOutlined /></div>
              <h1 className="iq-gate__title">Basketball IQ</h1>
              <p className="iq-gate__sub">Upgrade to <strong>Pro</strong> or above to access daily IQ challenges and earn XP.</p>
              <button className="iq-gate__cta" onClick={() => navigate('/settings')}>Upgrade Plan</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Already played today ───────────────────────────────────────────────────
  if (alreadyPlayed && phase !== 'result') {
    return (
      <div className="iq-root">
        <div className="iq-bg"><div className="iq-glow iq-glow--1" /><div className="iq-glow iq-glow--2" /><div className="iq-grid" /></div>
        <Sidebar userData={userData} onSignOut={handleSignOut} />
        <div className="sb-content-wrap">
          <main className="iq-main">
            <div className="iq-done">
              <CheckCircle className="iq-done__icon" />
              <h1 className="iq-done__title">Done for today!</h1>
              <p className="iq-done__sub">You've already completed today's IQ challenge. Come back tomorrow for 5 new questions.</p>
              <div className="iq-done__xp">
                <WorkspacePremium className="iq-done__xp-icon" />
                <span>{userXP} XP total</span>
              </div>
              <button className="iq-done__btn" onClick={() => navigate('/experience')}>View XP & Rewards</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="iq-root">
        <div className="iq-bg"><div className="iq-glow iq-glow--1" /><div className="iq-glow iq-glow--2" /><div className="iq-grid" /></div>
        <Sidebar userData={userData} onSignOut={handleSignOut} />
        <div className="sb-content-wrap">
          <main className="iq-main">
            <div className="iq-intro">
              <div className="iq-intro__eyebrow">
                <Psychology className="iq-eyebrow-icon" />
                Daily Challenge
              </div>
              <h1 className="iq-intro__title">BASKETBALL IQ</h1>
              <p className="iq-intro__sub">
                5 questions. 1 XP per correct answer. Max <strong>5 XP</strong> today.
              </p>

              <div className="iq-intro__rules">
                <div className="iq-rule">
                  <span className="iq-rule__num">5</span>
                  <span className="iq-rule__label">Questions</span>
                </div>
                <div className="iq-rule">
                  <span className="iq-rule__num">4</span>
                  <span className="iq-rule__label">Choices each</span>
                </div>
                <div className="iq-rule">
                  <span className="iq-rule__num">+1</span>
                  <span className="iq-rule__label">XP per correct</span>
                </div>
              </div>

              <div className="iq-intro__xp">
                <WorkspacePremium style={{ fontSize: '0.9rem', color: '#f5c842' }} />
                <span>Your XP: <strong>{userXP}</strong></span>
              </div>

              <button className="iq-btn-start" onClick={() => setPhase('quiz')}>
                Start Today's Quiz
                <ArrowForward style={{ fontSize: '1.1rem' }} />
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const correctCount = answers.filter((a) => a.correct).length;
    const perfect = correctCount === QUESTIONS_PER_DAY;

    return (
      <div className="iq-root">
        <div className="iq-bg"><div className="iq-glow iq-glow--1" /><div className="iq-glow iq-glow--2" /><div className="iq-grid" /></div>
        <Sidebar userData={userData} onSignOut={handleSignOut} />
        <div className="sb-content-wrap">
          <main className="iq-main">
            <div className="iq-result">
              <div className={`iq-result__badge ${perfect ? 'iq-result__badge--perfect' : ''}`}>
                {perfect ? <EmojiEvents /> : <Psychology />}
              </div>
              <h1 className="iq-result__title">
                {perfect ? 'PERFECT SCORE!' : `${correctCount} / ${QUESTIONS_PER_DAY} CORRECT`}
              </h1>
              <p className="iq-result__sub">
                {perfect
                  ? 'Incredible basketball IQ. You got every question right.'
                  : correctCount >= 3
                    ? 'Solid performance. Keep sharpening your basketball knowledge.'
                    : 'Keep studying — every day is a chance to improve.'}
              </p>

              <div className="iq-result__xp-card">
                <WorkspacePremium className="iq-result__xp-icon" />
                <div>
                  <div className="iq-result__xp-earned">+{xpEarned} XP earned</div>
                  <div className="iq-result__xp-total">Total: {(userXP || 0) + xpEarned} XP</div>
                </div>
              </div>

              <div className="iq-result__breakdown">
                {answers.map((a, i) => (
                  <div key={i} className={`iq-result__row ${a.correct ? 'iq-result__row--correct' : 'iq-result__row--wrong'}`}>
                    {a.correct
                      ? <CheckCircle className="iq-result__row-icon" />
                      : <Cancel className="iq-result__row-icon" />}
                    <span>Q{i + 1}</span>
                    <span className="iq-result__row-verdict">{a.correct ? '+1 XP' : '0 XP'}</span>
                  </div>
                ))}
              </div>

              <div className="iq-result__actions">
                <button className="iq-btn-xp" onClick={() => navigate('/experience')}>
                  <WorkspacePremium style={{ fontSize: '1rem' }} />
                  View XP & Rewards
                </button>
                <button className="iq-btn-home" onClick={() => navigate('/start')}>
                  Back to Home
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const progress = ((currentIdx) / QUESTIONS_PER_DAY) * 100;

  return (
    <div className="iq-root">
      <div className="iq-bg"><div className="iq-glow iq-glow--1" /><div className="iq-glow iq-glow--2" /><div className="iq-grid" /></div>
      <Sidebar userData={userData} onSignOut={handleSignOut} />
      <div className="sb-content-wrap">
        <main className="iq-main">
          <div className="iq-quiz">

            {/* Progress bar */}
            <div className="iq-quiz__meta">
              <span className="iq-quiz__counter">Question {currentIdx + 1} / {QUESTIONS_PER_DAY}</span>
              <span className="iq-quiz__xp-live">
                <WorkspacePremium style={{ fontSize: '0.8rem', color: '#f5c842' }} />
                {answers.filter((a) => a.correct).length} XP so far
              </span>
            </div>
            <div className="iq-progress-bar">
              <div className="iq-progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>

            {/* Question card */}
            <div className="iq-question-card">
              <div className="iq-question-card__label">
                <Psychology style={{ fontSize: '0.85rem' }} />
                Basketball IQ
              </div>
              <p className="iq-question-card__text">{currentQ?.q}</p>
            </div>

            {/* Options */}
            <div className="iq-options">
              {shuffledOpts.map((opt, i) => {
                let cls = 'iq-option';
                if (revealed) {
                  if (opt.isCorrect)         cls += ' iq-option--correct';
                  else if (i === selected)   cls += ' iq-option--wrong';
                  else                       cls += ' iq-option--dim';
                } else if (i === selected) {
                  cls += ' iq-option--selected';
                }
                return (
                  <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={revealed}>
                    <span className="iq-option__letter">{String.fromCharCode(65 + i)}</span>
                    <span className="iq-option__text">{opt.text}</span>
                    {revealed && opt.isCorrect  && <CheckCircle className="iq-option__icon" />}
                    {revealed && i === selected && !opt.isCorrect && <Cancel className="iq-option__icon" />}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            {revealed && (
              <button className="iq-btn-next" onClick={handleNext}>
                {currentIdx + 1 < QUESTIONS_PER_DAY ? 'Next Question' : 'See Results'}
                <ArrowForward style={{ fontSize: '1.1rem' }} />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BasketballIQScreen;