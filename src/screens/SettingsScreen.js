// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  ArrowBack,
  ArrowForward,
  Check,
  CheckCircle,
  Close,
  WorkspacePremium,
  Person,
  SportsBasketball,
  SaveOutlined,
  LockOpen,
} from '@mui/icons-material';
import './SettingsScreen.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTRIES = [
  'Australia', 'Argentina', 'Brazil', 'Cameroon', 'Canada', 'China',
  'Croatia', 'France', 'Germany', 'Greece', 'Italy', 'Japan',
  'Lithuania', 'Nigeria', 'Other', 'Philippines', 'Poland', 'Portugal',
  'Romania', 'Russia', 'Serbia', 'Spain', 'Turkey', 'United Kingdom',
  'United States',
].sort();

const POSITIONS = ['Guard', 'Forward', 'Center'];
const LEVELS    = ['Amateur', 'Youth', 'High School', 'College', 'Semi-Pro', 'Pro'];
const GENDERS   = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

// ─── Plan config ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    color: '#718096',
    priceId: null,
    tagline: 'No credit card required',
    perks: [
      'Mon, Wed & Fri training days',
      'Pro athlete workouts only',
      'All 7 training categories',
      'Weekly challenges — view & join',
      'Community posting in challenges',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 5,
    color: '#00D4AA',
    priceId: 'price_1TSYP4253nJJ89FuHVuEVAPh',
    tagline: 'Train every day',
    perks: [
      '7 training days per week',
      'Pro athlete workouts',
      'All 7 training categories',
      'Complete week → unlock library',
      'Progress tracking & feed',
    ],
  },
  {
    id: 'euroleague',
    name: 'EuroLeague',
    price: 15,
    color: '#FF5A1F',
    priceId: 'price_1TSYQF253nJJ89Fu4uZgVzP3',
    tagline: 'Train like European pros',
    popular: true,
    perks: [
      'Everything in Pro',
      'EuroLeague athlete workouts',
      'Duane Washington Jr. content',
      'Premium challenge access',
      'Priority new releases',
    ],
  },
  {
    id: 'nba',
    name: 'NBA',
    price: 30,
    color: '#667eea',
    priceId: 'price_1TSYQt253nJJ89FuGifFwk97',
    tagline: 'The pinnacle of training',
    perks: [
      'Everything in EuroLeague',
      'NBA-level athlete workouts',
      'Highest tier content',
      'All future ambassador drops',
      'Priority access to launches',
    ],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const SettingsScreen = () => {
  const navigate = useNavigate();

  const [authUser, setAuthUser]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError]           = useState('');

  // Plan popup
  const [showPlanPopup, setShowPlanPopup]     = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [planError, setPlanError]             = useState('');

  // Profile fields
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [country,     setCountry]     = useState('');
  const [age,         setAge]         = useState('');
  const [gender,      setGender]      = useState('');
  const [position,    setPosition]    = useState('');
  const [experience,  setExperience]  = useState('');
  const [level,       setLevel]       = useState('');
  const [favPlayer,   setFavPlayer]   = useState('');
  const [instagram,   setInstagram]   = useState('');
  const [favTeam,     setFavTeam]     = useState('');
  const [currentTier, setCurrentTier] = useState('free');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setFirstName(d.firstName   || '');
          setLastName(d.lastName     || '');
          setCountry(d.country       || '');
          setAge(d.age ? String(d.age) : '');
          setGender(d.gender         || '');
          setPosition(d.position     || '');
          setExperience(d.experienceYears ? String(d.experienceYears) : '');
          setLevel(d.level           || '');
          setFavPlayer(d.favPlayer   || '');
          setInstagram(d.instagram   || '');
          setFavTeam(d.favTeam       || '');
          setCurrentTier(d.tier      || 'free');
        }
      } catch (e) {
        // continue silently
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  // ─── Save profile ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!authUser) return;
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      await updateDoc(doc(db, 'users', authUser.uid), {
        firstName,
        lastName,
        country,
        age: parseInt(age) || 0,
        gender,
        position,
        experienceYears: parseInt(experience) || 0,
        level,
        favPlayer,
        instagram: instagram || null,
        favTeam,
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Plan select (Stripe or free downgrade) ───────────────────────────────
  const handlePlanSelect = async (plan) => {
    if (plan.id === currentTier) return;
    setPlanError('');

    // Downgrade to free — update Firestore directly
    // (in production: also call Stripe API to cancel subscription)
    if (plan.id === 'free') {
      try {
        await updateDoc(doc(db, 'users', authUser.uid), {
          tier: 'free',
          updatedAt: new Date().toISOString(),
        });
        setCurrentTier('free');
        setShowPlanPopup(false);
      } catch (e) {
        setPlanError('Could not update plan. Please try again.');
      }
      return;
    }

    // Upgrade — redirect to Stripe Checkout
    setCheckoutLoading(plan.id);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId:  authUser.uid,
          email:   authUser.email,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (e) {
      setPlanError('Checkout failed. Please try again.');
      setCheckoutLoading(null);
    }
  };

  const currentPlanConfig = PLANS.find((p) => p.id === currentTier) || PLANS[0];

  if (loading) {
    return (
      <div className="st-loading">
        <div className="st-loading-logo">ATLAS</div>
        <div className="st-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="st-root">

      {/* Background */}
      <div className="st-bg">
        <div className="st-glow st-glow--1" />
        <div className="st-glow st-glow--2" />
        <div className="st-grid" />
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="st-header">
        <div className="st-header__inner">
          <button className="st-back" onClick={() => navigate('/start')}>
            <ArrowBack className="st-back__icon" />
            <span>Dashboard</span>
          </button>
          <span className="st-header__logo">ATLAS</span>
          <div className="st-header__spacer" />
        </div>
      </header>

      <main className="st-main">
        <h1 className="st-page-title">SETTINGS</h1>

        {/* ── SUBSCRIPTION SECTION ─────────────────────────────────────────── */}
        <section className="st-section">
          <div className="st-section__header">
            <WorkspacePremium
              className="st-section__icon"
              style={{ color: currentPlanConfig.color }}
            />
            <h2 className="st-section__title">SUBSCRIPTION</h2>
          </div>

          <div
            className="st-plan-current"
            style={{ '--plan-color': currentPlanConfig.color }}
          >
            <div className="st-plan-current__left">
              <span className="st-plan-current__label">Current Plan</span>
              <span
                className="st-plan-current__name"
                style={{ color: currentPlanConfig.color }}
              >
                {currentPlanConfig.name.toUpperCase()}
              </span>
              <span className="st-plan-current__price">
                {currentPlanConfig.price === 0
                  ? 'Free forever'
                  : `$${currentPlanConfig.price} / month`}
              </span>
            </div>
            <button
              className="st-change-plan-btn"
              onClick={() => { setPlanError(''); setShowPlanPopup(true); }}
            >
              Change Plan
              <ArrowForward className="st-change-plan-btn__icon" />
            </button>
          </div>

          {currentTier === 'free' && (
            <div className="st-free-upsell">
              <LockOpen className="st-free-upsell__icon" />
              <div>
                <strong>Unlock daily training</strong>
                <p>Upgrade to Pro or higher for access every day of the week.</p>
              </div>
              <button
                className="st-free-upsell__btn"
                onClick={() => { setPlanError(''); setShowPlanPopup(true); }}
              >
                Upgrade
              </button>
            </div>
          )}
        </section>

        {/* ── PROFILE SECTION ──────────────────────────────────────────────── */}
        <section className="st-section">
          <div className="st-section__header">
            <Person className="st-section__icon" style={{ color: '#00D4AA' }} />
            <h2 className="st-section__title">PROFILE</h2>
          </div>

          {/* Avatar row */}
          <div className="st-avatar-row">
            <div
              className="st-avatar-circle"
              style={{ background: currentPlanConfig.color }}
            >
              {firstName ? firstName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="st-avatar-info">
              <span className="st-avatar-name">{firstName} {lastName}</span>
              <span className="st-avatar-email">{authUser?.email}</span>
            </div>
          </div>

          <div className="st-form">

            {/* Name */}
            <div className="st-form-row">
              <div className="st-field">
                <label className="st-label">First name</label>
                <input
                  className="st-input"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="st-field">
                <label className="st-label">Last name</label>
                <input
                  className="st-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Country */}
            <div className="st-field">
              <label className="st-label">Country</label>
              <select
                className="st-select"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Age + Gender */}
            <div className="st-form-row">
              <div className="st-field">
                <label className="st-label">Age</label>
                <input
                  className="st-input"
                  type="number"
                  min="8"
                  max="60"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="st-field">
                <label className="st-label">Gender</label>
                <select
                  className="st-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Position */}
            <div className="st-field">
              <label className="st-label">Position</label>
              <div className="st-choice-group">
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`st-choice ${position === p ? 'st-choice--active' : ''}`}
                    onClick={() => setPosition(p)}
                  >
                    <SportsBasketball className="st-choice-icon" />
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="st-field">
              <label className="st-label">Years of experience</label>
              <input
                className="st-input"
                type="number"
                min="0"
                max="30"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>

            {/* Level */}
            <div className="st-field">
              <label className="st-label">Current level</label>
              <div className="st-level-group">
                {LEVELS.map((l, i) => (
                  <button
                    key={l}
                    type="button"
                    className={`st-level ${level === l ? 'st-level--active' : ''}`}
                    onClick={() => setLevel(l)}
                  >
                    <span className="st-level__num">{i + 1}</span>
                    <span className="st-level__name">{l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Favourite player */}
            <div className="st-field">
              <label className="st-label">Favourite player</label>
              <input
                className="st-input"
                type="text"
                placeholder="e.g. LeBron James, Duane Washington Jr."
                value={favPlayer}
                onChange={(e) => setFavPlayer(e.target.value)}
              />
            </div>

            {/* Instagram */}
            <div className="st-field">
              <label className="st-label">
                Instagram handle
                <span className="st-label-optional">(optional)</span>
              </label>
              <div className="st-input-prefix-wrap">
                <span className="st-input-prefix">@</span>
                <input
                  className="st-input st-input--prefixed"
                  type="text"
                  placeholder="yourusername"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
                />
              </div>
            </div>

            {/* Favourite team */}
            <div className="st-field">
              <label className="st-label">Favourite team</label>
              <input
                className="st-input"
                type="text"
                placeholder="e.g. LA Lakers, Partizan Belgrade"
                value={favTeam}
                onChange={(e) => setFavTeam(e.target.value)}
              />
            </div>

            {error && (
              <div className="st-form-error">{error}</div>
            )}

            <button
              className={`st-save-btn ${saveSuccess ? 'st-save-btn--success' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <span className="st-spinner" />
              ) : saveSuccess ? (
                <>
                  <CheckCircle className="st-save-btn__icon" />
                  Saved Successfully
                </>
              ) : (
                <>
                  <SaveOutlined className="st-save-btn__icon" />
                  Save Changes
                </>
              )}
            </button>

          </div>
        </section>
      </main>

      {/* ── PLAN POPUP ───────────────────────────────────────────────────────── */}
      {showPlanPopup && (
        <div
          className="st-overlay"
          onClick={() => setShowPlanPopup(false)}
        >
          <div
            className="st-popup"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup header */}
            <div className="st-popup__header">
              <div>
                <h2 className="st-popup__title">CHOOSE YOUR PLAN</h2>
                <p className="st-popup__sub">
                  Your active plan is highlighted below
                </p>
              </div>
              <button
                className="st-popup__close"
                onClick={() => setShowPlanPopup(false)}
              >
                <Close />
              </button>
            </div>

            {planError && (
              <div className="st-popup__error">{planError}</div>
            )}

            {/* Plan cards grid */}
            <div className="st-popup__grid">
              {PLANS.map((plan) => {
                const isActive  = plan.id === currentTier;
                const isLoading = checkoutLoading === plan.id;
                const currentPrice = PLANS.find((p) => p.id === currentTier)?.price || 0;
                const isUpgrade = plan.price > currentPrice;

                return (
                  <div
                    key={plan.id}
                    className={`st-plan-card ${isActive ? 'st-plan-card--active' : ''} ${plan.popular ? 'st-plan-card--popular' : ''}`}
                    style={{ '--plan-color': plan.color }}
                  >
                    {plan.popular && !isActive && (
                      <div className="st-plan-card__popular">Most Popular</div>
                    )}
                    {isActive && (
                      <div className="st-plan-card__current">Current Plan</div>
                    )}

                    <h3
                      className="st-plan-card__name"
                      style={{ color: plan.color }}
                    >
                      {plan.name}
                    </h3>

                    <div className="st-plan-card__pricing">
                      {plan.price === 0 ? (
                        <span className="st-plan-card__price-free">Free</span>
                      ) : (
                        <>
                          <span className="st-plan-card__currency">$</span>
                          <span className="st-plan-card__amount">{plan.price}</span>
                          <span className="st-plan-card__period">/mo</span>
                        </>
                      )}
                    </div>

                    <p className="st-plan-card__tagline">{plan.tagline}</p>

                    <ul className="st-plan-card__perks">
                      {plan.perks.map((perk, i) => (
                        <li key={i}>
                          <Check
                            className="st-plan-card__check"
                            style={{ color: plan.color }}
                          />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`st-plan-card__btn ${isActive ? 'st-plan-card__btn--current' : ''} ${isUpgrade ? 'st-plan-card__btn--upgrade' : ''}`}
                      style={
                        !isActive && isUpgrade
                          ? { '--btn-color': plan.color }
                          : {}
                      }
                      onClick={() => handlePlanSelect(plan)}
                      disabled={isActive || isLoading}
                    >
                      {isLoading ? (
                        <span className="st-spinner" />
                      ) : isActive ? (
                        'Current Plan'
                      ) : isUpgrade ? (
                        <>
                          Upgrade to {plan.name}
                          <ArrowForward className="st-plan-card__btn-icon" />
                        </>
                      ) : (
                        'Downgrade to Free'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="st-popup__note">
              Secure checkout powered by Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsScreen;