// src/screens/SignupScreen.js
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  ArrowForward,
  ArrowBack,
  Visibility,
  VisibilityOff,
  Error as ErrorIcon,
  CheckCircle,
  Person,
  SportsBasketball,
  Star,
} from '@mui/icons-material';
import './SignupScreen.css';

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Account',  icon: <Person />,            title: 'Create Account',       sub: 'Start with your login details' },
  { label: 'Profile',  icon: <Person />,             title: 'About You',            sub: 'Tell us a little about yourself' },
  { label: 'Hoops',    icon: <SportsBasketball />,   title: 'Your Basketball',      sub: 'Help us personalise your training' },
  { label: 'Vibe',     icon: <Star />,               title: 'Your Inspiration',     sub: 'Who drives you to be great?' },
];

const COUNTRIES = [
  'United States', 'Romania', 'Spain', 'France', 'Germany', 'Italy',
  'Serbia', 'Greece', 'Lithuania', 'Croatia', 'Australia', 'Brazil',
  'Canada', 'United Kingdom', 'Turkey', 'Russia', 'Argentina', 'Nigeria',
  'Cameroon', 'Japan', 'China', 'Philippines', 'Poland', 'Portugal', 'Other',
].sort();

const POSITIONS = ['Guard', 'Forward', 'Center'];
const LEVELS    = ['Amateur', 'Youth', 'High School', 'College', 'Semi-Pro', 'Pro'];
const GENDERS   = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

// ─── Main Component ───────────────────────────────────────────────────────────
const SignupScreen = () => {
  const navigate   = useNavigate();
  const formRef    = useRef(null);

  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  // ── Step 0 — Account ──
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Step 1 — Personal info ──
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [country,   setCountry]   = useState('');
  const [age,       setAge]       = useState('');
  const [gender,    setGender]    = useState('');

  // ── Step 2 — Basketball ──
  const [position,   setPosition]   = useState('');
  const [experience, setExperience] = useState('');
  const [level,      setLevel]      = useState('');

  // ── Step 3 — Inspiration ──
  const [favPlayer, setFavPlayer] = useState('');
  const [instagram, setInstagram] = useState('');
  const [favTeam,   setFavTeam]   = useState('');

  // ── Validation per step ──
  const validate = () => {
    switch (step) {
      case 0:
        if (!email || !password || !confirm) return 'Please fill in all fields.';
        if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email.';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        if (password !== confirm) return 'Passwords do not match.';
        return '';
      case 1:
        if (!firstName || !lastName || !country || !age || !gender)
          return 'Please fill in all fields.';
        if (isNaN(age) || parseInt(age) < 8 || parseInt(age) > 60)
          return 'Please enter a valid age (8–60).';
        return '';
      case 2:
        if (!position || !experience || !level)
          return 'Please fill in all fields.';
        if (isNaN(experience) || parseInt(experience) < 0)
          return 'Please enter valid years of experience.';
        return '';
      case 3:
        if (!favPlayer || !favTeam) return 'Please fill in at least your favourite player and team.';
        return '';
      default:
        return '';
    }
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  };

  const back = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email,
        firstName,
        lastName,
        country,
        age: parseInt(age),
        gender,
        position,
        experienceYears: parseInt(experience),
        level,
        favPlayer,
        instagram: instagram || null,
        favTeam,
        // ── Subscription tier — always starts as free ──
        tier: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date().toISOString(),
      });
      setDone(true);
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setError('Password must be at least 6 characters.');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Success screen ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="signup-root">
        <div className="signup-bg">
          <div className="su-glow su-glow--1" />
          <div className="su-glow su-glow--2" />
          <div className="su-grid" />
        </div>
        <div className="signup-success">
          <div className="success-icon-wrap">
            <CheckCircle className="success-icon" />
          </div>
          <h1 className="success-title">YOU'RE IN.</h1>
          <p className="success-sub">
            Welcome to Atlas, <strong>{firstName}</strong>. Your pro journey starts now.
          </p>
          <button className="su-btn-primary su-btn-primary--xl" onClick={() => navigate('/start')}>
            Go to Dashboard <ArrowForward className="su-btn-icon" />
          </button>
        </div>
      </div>
    );
  }

  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="signup-root">
      {/* Background */}
      <div className="signup-bg">
        <div className="su-glow su-glow--1" />
        <div className="su-glow su-glow--2" />
        <div className="su-grid" />
      </div>

      {/* Logo */}
      <button className="signup-logo" onClick={() => navigate('/')}>ATLAS</button>

      <div className="signup-shell">
        {/* ── Progress header ─────────────────────────────────────────────── */}
        <div className="su-progress-wrap">
          <div className="su-steps">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`su-step ${i === step ? 'su-step--active' : ''} ${i < step ? 'su-step--done' : ''}`}
              >
                <div className="su-step__dot">
                  {i < step ? <CheckCircle className="su-step__check" /> : (
                    <span className="su-step__num">{i + 1}</span>
                  )}
                </div>
                <span className="su-step__label">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="su-progress-bar">
            <div className="su-progress-bar__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <div className="su-card" ref={formRef}>
          <div className="su-card__header">
            <h2 className="su-card__title">{STEPS[step].title}</h2>
            <p className="su-card__sub">{STEPS[step].sub}</p>
          </div>

          {error && (
            <div className="su-error">
              <ErrorIcon className="su-error__icon" />
              {error}
            </div>
          )}

          {/* ── Step 0: Account ─────────────────────────────────────────── */}
          {step === 0 && (
            <div className="su-fields">
              <div className="su-field">
                <label className="su-label">Email address</label>
                <input
                  className="su-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="su-field">
                <label className="su-label">Password</label>
                <div className="su-input-wrap">
                  <input
                    className="su-input su-input--pw"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="su-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                    {showPw ? <VisibilityOff /> : <Visibility />}
                  </button>
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Confirm password</label>
                <div className="su-input-wrap">
                  <input
                    className={`su-input su-input--pw ${confirm && confirm !== password ? 'su-input--error' : ''} ${confirm && confirm === password && confirm.length > 0 ? 'su-input--ok' : ''}`}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  <button type="button" className="su-pw-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </button>
                  {confirm && confirm === password && (
                    <CheckCircle className="su-input-check" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Personal Info ───────────────────────────────────── */}
          {step === 1 && (
            <div className="su-fields">
              <div className="su-row">
                <div className="su-field">
                  <label className="su-label">First name</label>
                  <input className="su-input" type="text" placeholder="e.g. Luca" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="su-field">
                  <label className="su-label">Last name</label>
                  <input className="su-input" type="text" placeholder="e.g. Ionescu" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Country</label>
                <select className="su-select" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="su-row">
                <div className="su-field">
                  <label className="su-label">Age</label>
                  <input className="su-input" type="number" placeholder="e.g. 18" min="8" max="60" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="su-field">
                  <label className="su-label">Gender</label>
                  <select className="su-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select gender</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Basketball ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="su-fields">
              <div className="su-field">
                <label className="su-label">Position</label>
                <div className="su-choice-group">
                  {POSITIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`su-choice ${position === p ? 'su-choice--active' : ''}`}
                      onClick={() => setPosition(p)}
                    >
                      <SportsBasketball className="su-choice-icon" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Years of experience</label>
                <input
                  className="su-input"
                  type="number"
                  placeholder="e.g. 5"
                  min="0"
                  max="30"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>

              <div className="su-field">
                <label className="su-label">Current level</label>
                <div className="su-level-group">
                  {LEVELS.map((l, i) => (
                    <button
                      key={l}
                      type="button"
                      className={`su-level ${level === l ? 'su-level--active' : ''}`}
                      onClick={() => setLevel(l)}
                    >
                      <span className="su-level__num">{i + 1}</span>
                      <span className="su-level__name">{l}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Inspiration ────────────────────────────────────── */}
          {step === 3 && (
            <div className="su-fields">
              <div className="su-field">
                <label className="su-label">Favourite player</label>
                <input
                  className="su-input"
                  type="text"
                  placeholder="e.g. LeBron James, Duane Washington Jr."
                  value={favPlayer}
                  onChange={(e) => setFavPlayer(e.target.value)}
                />
              </div>

              <div className="su-field">
                <label className="su-label">
                  Instagram handle
                  <span className="su-label-optional">(optional)</span>
                </label>
                <div className="su-input-prefix-wrap">
                  <span className="su-input-prefix">@</span>
                  <input
                    className="su-input su-input--prefixed"
                    type="text"
                    placeholder="yourusername"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
                  />
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Favourite team</label>
                <input
                  className="su-input"
                  type="text"
                  placeholder="e.g. LA Lakers, Partizan Belgrade"
                  value={favTeam}
                  onChange={(e) => setFavTeam(e.target.value)}
                />
              </div>

              <div className="su-terms">
                By creating an account you agree to Atlas Basketball's{' '}
                <a href="#terms">Terms of Service</a> and{' '}
                <a href="#privacy">Privacy Policy</a>.
              </div>
            </div>
          )}

          {/* ── Navigation ──────────────────────────────────────────────── */}
          <div className="su-nav">
            {step > 0 ? (
              <button type="button" className="su-btn-back" onClick={back}>
                <ArrowBack className="su-btn-icon" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button type="button" className="su-btn-primary" onClick={next}>
                Continue <ArrowForward className="su-btn-icon" />
              </button>
            ) : (
              <button
                type="button"
                className={`su-btn-primary ${loading ? 'su-btn-primary--loading' : ''}`}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <span className="su-spinner" />
                ) : (
                  <>Create Account <ArrowForward className="su-btn-icon" /></>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="su-switch">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')}>
            Sign in <ArrowForward style={{ fontSize: '0.85rem', verticalAlign: 'middle' }} />
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupScreen;