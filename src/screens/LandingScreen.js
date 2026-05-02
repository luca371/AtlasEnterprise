// src/screens/LandingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VideoLibrary, EmojiEvents, BarChart, Whatshot, TrackChanges,
  SportsBasketball, Visibility, WorkspacePremium, CheckCircle,
  PlayArrow, RadioButtonUnchecked, ArrowForward, People,
  FitnessCenter, Public, Check, Lock, LockOpen, CalendarMonth,
  Shuffle, LibraryBooks, Star, KeyboardArrowDown,
} from '@mui/icons-material';
import './LandingScreen.css';

// ─── Counter Hook ─────────────────────────────────────────────────────────────
const useCounter = (end, duration = 2200) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const tick = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(end * ease(progress)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, end, duration]);
  return [count, ref];
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const ambassadors = [
  { id: 1, name: 'DUANE WASHINGTON JR.', position: 'Guard', team: 'Partizan Belgrade', tier: 'EuroLeague Tier', number: '7', specialty: 'Scoring & Shot Creation', quote: 'Every rep in practice is a rep closer to the big stage.', color: '#FF5A1F', initials: 'DW', logo: '/images/logo_duane.png' },
  { id: 2, name: 'COMING SOON', position: 'Pro Athlete', team: 'EuroLeague', tier: 'EuroLeague Tier', number: '?', specialty: 'To Be Announced', quote: 'The next ambassador is being finalized.', color: '#00D4AA', initials: '?', logo: null },
  { id: 3, name: 'COMING SOON', position: 'Pro Athlete', team: 'NBA', tier: 'NBA Tier', number: '?', specialty: 'To Be Announced', quote: 'More elite athletes joining soon.', color: '#667eea', initials: '?', logo: null },
];

const features = [
  { icon: <VideoLibrary />,   title: 'Pro Workout Library',        desc: 'Access real training routines from Euroleague athletes — exactly what they do in the off-season.' },
  { icon: <CalendarMonth />,  title: 'Daily Training Plans',       desc: '7–8 workouts delivered every day, randomly selected from your tier\'s athletes. Fresh every session.' },
  { icon: <EmojiEvents />,    title: 'Skill Challenges',           desc: 'Weekly challenges from your favorite players. Complete the week and unlock everything permanently.' },
  { icon: <BarChart />,       title: 'Progress Tracking',          desc: 'Log sessions, measure improvement, and see your development over time.' },
  { icon: <Whatshot />,       title: 'Ambassador Feed',            desc: 'Stay connected with pro athletes through exclusive updates, tips, and behind-the-scenes content.' },
  { icon: <TrackChanges />,   title: 'Position-Specific Training', desc: 'Programs tailored to your position — Guard, Forward, or Center.' },
];

const dailyPlan = [
  { time: 'Day 1', label: 'Ball Handling Fundamentals', duration: '15 min', level: 'Foundation',   done: true },
  { time: 'Day 2', label: 'Shooting off the Dribble',   duration: '20 min', level: 'Intermediate', done: true },
  { time: 'Day 3', label: 'Rest & Film Study',          duration: '20 min', level: 'Recovery',     done: false, active: true },
  { time: 'Day 4', label: 'Defense Footwork',           duration: '10 min', level: 'Advanced',     done: false },
  { time: 'Day 5', label: 'Pick & Roll Reads',          duration: '10 min', level: 'Elite',        done: false },
];

const challenges = [
  { title: '500 Makes Challenge',   player: 'Duane Washington Jr.', reward: 'Pro Badge',      deadline: '7 days left', participants: 1240, icon: <SportsBasketball /> },
  { title: 'No-Look Pass Master',   player: 'Duane Washington Jr.', reward: 'Vision Badge',   deadline: '3 days left', participants: 892,  icon: <Visibility /> },
  { title: '30-Day Consistency',    player: 'Atlas Team',           reward: 'Iron Will Badge', deadline: 'Ongoing',    participants: 3401, icon: <Whatshot /> },
];

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    color: '#718096',
    popular: false,
    tagline: 'No credit card required',
    includes: null,
    athletes: 'Pro-level athletes',
    athleteDesc: 'Get started with 3 training days per week from verified Pro athletes.',
    perks: [
      'Mon, Wed & Fri training days',
      'Pro athlete content only',
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
    popular: false,
    tagline: 'Train every day',
    includes: null,
    athletes: 'Pro-level athletes',
    athleteDesc: 'Daily workouts designed and delivered by verified Pro athletes.',
    perks: [
      '7 training days per week',
      'All 7 training categories',
      'Ball Handling, Shooting, Strength & more',
      'Complete the week — unlock to library',
      'Progress tracking & ambassador feed',
    ],
  },
  {
    id: 'euroleague',
    name: 'EuroLeague',
    price: 15,
    color: '#FF5A1F',
    popular: true,
    tagline: 'Train like European pros',
    includes: 'Pro',
    athletes: 'EuroLeague athletes',
    athleteDesc: 'Daily workouts from active EuroLeague players — including Duane Washington Jr.',
    perks: [
      '7 training days per week',
      'All 7 training categories',
      'Ball Handling, Shooting, Strength & more',
      'Complete the week — unlock to library',
      'Progress tracking & ambassador feed',
    ],
  },
  {
    id: 'nba',
    name: 'NBA',
    price: 30,
    color: '#667eea',
    popular: false,
    tagline: 'The elite level',
    includes: 'EuroLeague + Pro',
    athletes: 'NBA-level athletes',
    athleteDesc: 'Daily workouts from the highest level of the game. The pinnacle of basketball training.',
    perks: [
      '7 training days per week',
      'All 7 training categories',
      'Ball Handling, Shooting, Strength & more',
      'Complete the week — unlock to library',
      'Progress tracking & ambassador feed',
    ],
  },
];

const trainingTypes = ['Ball Handling', 'Shooting', 'Strength', 'Post Up', 'Mid Range', 'Stamina', 'Court IQ'];

const DayIcon = ({ done, active }) => {
  if (done)   return <CheckCircle          className="day-icon day-icon--done" />;
  if (active) return <PlayArrow            className="day-icon day-icon--active" />;
  return        <RadioButtonUnchecked      className="day-icon day-icon--upcoming" />;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LandingScreen = () => {
  const navigate = useNavigate();
  const [activeAmbassador, setActiveAmbassador] = useState(0);
  const [scrollY, setScrollY]   = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const heroRef       = useRef(null);
  const ambassadorsRef = useRef(null);
  const howRef        = useRef(null);
  const featuresRef   = useRef(null);
  const pricingRef    = useRef(null);

  const [userCount,    userRef]    = useCounter(12400, 2000);
  const [workoutCount, workoutRef] = useCounter(340,   1800);
  const [playerCount,  playerRef]  = useCounter(8,     1500);
  const [countryCount, countryRef] = useCounter(24,    2200);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAmbassador((prev) => (prev + 1) % ambassadors.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const scrollTo = (ref) => {
    setMenuOpen(false);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const current = ambassadors[activeAmbassador];

  return (
    <div className="land-root">

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav className={`land-nav ${scrollY > 60 ? 'land-nav--scrolled' : ''}`}>
        <div className="land-nav__inner">
          <button className="land-nav__logo-btn" onClick={() => scrollTo(heroRef)}>ATLAS</button>
          <div className="land-nav__links">
            <button onClick={() => scrollTo(howRef)}>How It Works</button>
            <button onClick={() => scrollTo(featuresRef)}>Features</button>
            <button onClick={() => scrollTo(ambassadorsRef)}>Players</button>
            <button onClick={() => scrollTo(pricingRef)}>Pricing</button>
          </div>
          <div className="land-nav__actions">
            <button className="btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span className={`ham-line ${menuOpen ? 'ham-line--open-1' : ''}`} />
            <span className={`ham-line ${menuOpen ? 'ham-line--open-2' : ''}`} />
            <span className={`ham-line ${menuOpen ? 'ham-line--open-3' : ''}`} />
          </button>
        </div>
        <div className={`land-nav__mobile ${menuOpen ? 'land-nav__mobile--open' : ''}`}>
          <button onClick={() => scrollTo(howRef)}>How It Works</button>
          <button onClick={() => scrollTo(featuresRef)}>Features</button>
          <button onClick={() => scrollTo(ambassadorsRef)}>Players</button>
          <button onClick={() => scrollTo(pricingRef)}>Pricing</button>
          <div className="mobile-nav-actions">
            <button className="btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn-primary" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="land-hero" ref={heroRef}>
        <div className="land-hero__bg">
          <div className="hero-grain" />
          <div className="hero-glow hero-glow--1" />
          <div className="hero-glow hero-glow--2" />
          <div className="hero-court-lines" />
        </div>
        <div className="land-hero__content">
          <h1 className="hero-title">
            <span className="hero-title__line hero-title__line--1">TRAIN LIKE</span>
            <span className="hero-title__line hero-title__line--2">
              <span className="hero-title__accent">THE PROS</span>
            </span>
            <span className="hero-title__line hero-title__line--3">PLAY LIKE ONE</span>
          </h1>
          <p className="hero-sub">
            Access real workouts from professional Euroleague athletes.<br />
            Not simulated. Not generic. <strong>Their actual training.</strong>
          </p>
          <div className="hero-cta">
            <button className="btn-primary btn-primary--lg" onClick={() => navigate('/signup')}>
              Start Training Free <ArrowForward className="btn-icon" />
            </button>
            <button className="btn-ghost btn-ghost--lg" onClick={() => scrollTo(pricingRef)}>
              View Plans
            </button>
          </div>
          <div className="hero-social-proof">
            <div className="proof-avatars">
              {['D', 'M', 'A', 'K', 'R'].map((l, i) => (
                <div key={i} className="proof-avatar" style={{ '--i': i }}>{l}</div>
              ))}
            </div>
            <span className="proof-text">Join <strong>12,000+</strong> players already training</span>
          </div>
        </div>
        <button className="hero-scroll-hint" onClick={() => scrollTo(ambassadorsRef)}>
          <div className="scroll-line" />
          <KeyboardArrowDown className="scroll-arrow" />
        </button>
      </section>

      {/* ── AMBASSADOR CAROUSEL ─────────────────────────────────────────────── */}
      <section className="land-ambassadors" id="ambassadors" ref={ambassadorsRef}>
        <div className="land-section-label">Pro Athletes</div>
        <h2 className="land-section-title">
          TRAIN WITH<br /><span className="text-accent">REAL PLAYERS</span>
        </h2>
        <p className="land-section-sub">Our ambassadors share their actual workouts, not curated content.</p>

        <div className="amb-carousel">
          <div className="amb-card amb-card--active" style={{ '--card-color': current.color }}>
            <div className="amb-card__number">{current.number}</div>
            <div className="amb-card__avatar">
              {current.logo ? (
                <div className="amb-avatar-img-wrap">
                  <img
                    src={process.env.PUBLIC_URL + current.logo}
                    alt={current.name}
                    className="amb-avatar-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="amb-avatar-fallback" style={{ background: current.color, display: 'none' }}>
                    {current.initials}
                  </div>
                </div>
              ) : (
                <div className="amb-avatar-circle" style={{ background: current.color }}>
                  {current.initials}
                </div>
              )}
              <div className="amb-avatar-ring" />
            </div>
            <div className="amb-card__info">
              <div className="amb-card__badges">
                <div className="amb-card__tier-badge" style={{ borderColor: current.color, color: current.color }}>
                  {current.tier}
                </div>
              </div>
              <h3 className="amb-card__name">{current.name}</h3>
              <p className="amb-card__team">{current.team} · {current.position}</p>
              <p className="amb-card__specialty">Specialty: {current.specialty}</p>
              <blockquote className="amb-card__quote">"{current.quote}"</blockquote>
            </div>
            <div className="amb-card__glow" style={{ background: current.color }} />
          </div>

          <div className="amb-dots">
            {ambassadors.map((_, i) => (
              <button
                key={i}
                className={`amb-dot ${i === activeAmbassador ? 'amb-dot--active' : ''}`}
                onClick={() => setActiveAmbassador(i)}
                style={{ '--dot-color': ambassadors[i].color }}
              />
            ))}
          </div>

          {/* THUMBNAILS — arata DOAR initiale, nu poza (fix duplicate Duane) */}
          <div className="amb-thumbs">
            {ambassadors.map((a, i) => (
              <button
                key={a.id}
                className={`amb-thumb ${i === activeAmbassador ? 'amb-thumb--active' : ''}`}
                onClick={() => setActiveAmbassador(i)}
                style={{ '--thumb-color': a.color }}
              >
                <div className="amb-thumb__avatar" style={{ background: a.color }}>
                  {a.initials}
                </div>
                <div className="amb-thumb__info">
                  <span className="amb-thumb__name">{a.name}</span>
                  <span className="amb-thumb__team">{a.team}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="land-how" id="how" ref={howRef}>
        <div className="land-section-label">The System</div>
        <h2 className="land-section-title">
          HOW YOUR WEEK<br /><span className="text-accent">ACTUALLY WORKS</span>
        </h2>
        <p className="land-section-sub">Every day is different. Every week you unlock more. Here's the system.</p>

        <div className="how-flow">
          <div className="how-flow__step">
            <div className="how-flow__icon-wrap how-flow__icon-wrap--teal"><Star /></div>
            <div className="how-flow__content">
              <span className="how-flow__num">01</span>
              <h3 className="how-flow__title">Pick Your Tier</h3>
              <p className="how-flow__desc">Start free or choose Pro, EuroLeague, or NBA. Higher tiers include all workouts from lower tiers.</p>
              <div className="how-flow__tier-pills">
                <span className="tier-pill tier-pill--grey">Free</span>
                <span className="tier-pill tier-pill--teal">Pro</span>
                <span className="tier-pill tier-pill--orange">EuroLeague</span>
                <span className="tier-pill tier-pill--purple">NBA</span>
              </div>
            </div>
          </div>

          <div className="how-flow__connector"><ArrowForward /></div>

          <div className="how-flow__step">
            <div className="how-flow__icon-wrap how-flow__icon-wrap--orange"><Shuffle /></div>
            <div className="how-flow__content">
              <span className="how-flow__num">02</span>
              <h3 className="how-flow__title">Get Daily Workouts</h3>
              <p className="how-flow__desc">Every day you receive 7–8 workouts, randomly drawn from your tier's athletes. No two days are the same.</p>
              <div className="how-flow__categories">
                {trainingTypes.map((t, i) => <span key={i} className="cat-pill">{t}</span>)}
              </div>
            </div>
          </div>

          <div className="how-flow__connector"><ArrowForward /></div>

          <div className="how-flow__step">
            <div className="how-flow__icon-wrap how-flow__icon-wrap--purple"><CalendarMonth /></div>
            <div className="how-flow__content">
              <span className="how-flow__num">03</span>
              <h3 className="how-flow__title">Complete the Week</h3>
              <p className="how-flow__desc">Finish all your daily sessions. Track every session. Don't skip a day.</p>
              <div className="how-flow__week">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className={`week-day ${i < 2 ? 'week-day--done' : i === 2 ? 'week-day--active' : ''}`}>
                    {d}
                    {i < 2 && <CheckCircle className="week-check" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="how-flow__connector"><ArrowForward /></div>

          <div className="how-flow__step">
            <div className="how-flow__icon-wrap how-flow__icon-wrap--gold"><LockOpen /></div>
            <div className="how-flow__content">
              <span className="how-flow__num">04</span>
              <h3 className="how-flow__title">Unlock Forever</h3>
              <p className="how-flow__desc">Finish the week and every workout gets added permanently to your library.</p>
              <div className="how-flow__unlock">
                <div className="unlock-item unlock-item--locked"><Lock className="unlock-icon" /><span>Week incomplete</span></div>
                <ArrowForward className="unlock-arrow" />
                <div className="unlock-item unlock-item--open"><LockOpen className="unlock-icon" /><span>Library unlocked</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section className="land-pricing" id="pricing" ref={pricingRef}>
        <div className="land-section-label">Plans</div>
        <h2 className="land-section-title">
          CHOOSE YOUR<br /><span className="text-accent">TIER</span>
        </h2>
        <p className="land-section-sub">Start free. Upgrade whenever you're ready. Cancel anytime.</p>

        <div className="pricing-allcats">
          <span className="pricing-allcats__label">All plans include:</span>
          <div className="pricing-allcats__pills">
            {trainingTypes.map((t, i) => (
              <span key={i} className="cat-pill cat-pill--active cat-pill--sm">{t}</span>
            ))}
          </div>
        </div>

        <div className="pricing-grid pricing-grid--4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.popular ? 'pricing-card--popular' : ''} ${plan.id === 'free' ? 'pricing-card--free' : ''}`}
              style={{ '--plan-color': plan.color }}
            >
              {/* Badge — INSIDE card (nu e taiat de overflow:hidden) */}
              {plan.popular && (
                <div className="pricing-popular-badge">Most Popular</div>
              )}
              {plan.id === 'free' && (
                <div className="pricing-free-badge">Always Free</div>
              )}

              <div className="pricing-card__header">
                <h3 className="pricing-card__name">{plan.name}</h3>
                <p className="pricing-card__tagline">{plan.tagline}</p>
                <div className="pricing-card__price">
                  {plan.price === 0 ? (
                    <span className="price-amount price-amount--free">Free</span>
                  ) : (
                    <>
                      <span className="price-currency">$</span>
                      <span className="price-amount">{plan.price}</span>
                      <span className="price-period">/mo</span>
                    </>
                  )}
                </div>
                {plan.includes && (
                  <div className="pricing-includes">
                    <Check className="includes-check" />
                    Includes {plan.includes} tier
                  </div>
                )}
              </div>

              <div
                className="pricing-athlete-block"
                style={{
                  borderColor: `color-mix(in srgb, ${plan.color} 30%, transparent)`,
                  background:  `color-mix(in srgb, ${plan.color} 6%, transparent)`,
                }}
              >
                <People className="pricing-athlete-icon" style={{ color: plan.color }} />
                <div>
                  <p className="pricing-athlete-title" style={{ color: plan.color }}>{plan.athletes}</p>
                  <p className="pricing-athlete-desc">{plan.athleteDesc}</p>
                </div>
              </div>

              <ul className="pricing-card__perks">
                {plan.perks.map((p, i) => (
                  <li key={i}>
                    <Check className="perk-check" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <button
                className={
                  plan.popular
                    ? 'btn-primary btn-primary--full'
                    : plan.id === 'free'
                    ? 'btn-ghost btn-ghost--full btn-ghost--free'
                    : 'btn-ghost btn-ghost--full'
                }
                onClick={() => navigate('/signup')}
              >
                {plan.id === 'free' ? 'Start Free' : `Get ${plan.name}`}
                <ArrowForward className="btn-icon" />
              </button>
            </div>
          ))}
        </div>

        <p className="pricing-note">
          <LibraryBooks className="pricing-note-icon" />
          Complete every week's daily sessions and unlock those workouts to your personal library — permanently.
        </p>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="land-features" id="features" ref={featuresRef}>
        <div className="land-section-label">Platform</div>
        <h2 className="land-section-title">
          EVERYTHING YOU<br /><span className="text-accent">NEED TO GROW</span>
        </h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feat-card" key={i} style={{ '--delay': `${i * 0.08}s` }}>
              <div className="feat-card__icon">{f.icon}</div>
              <h3 className="feat-card__title">{f.title}</h3>
              <p className="feat-card__desc">{f.desc}</p>
              <div className="feat-card__line" />
            </div>
          ))}
        </div>
      </section>

      {/* ── DAILY PLAN PREVIEW ───────────────────────────────────────────────── */}
      <section className="land-daily">
        <div className="daily-inner">
          <div className="daily-text">
            <div className="land-section-label">Sample Week</div>
            <h2 className="land-section-title land-section-title--left">
              YOUR DAILY<br /><span className="text-accent">TRAINING PLAN</span>
            </h2>
            <p className="land-section-sub land-section-sub--left">
              Every session is designed by pro athletes. Structured. Progressive. Finish the week and every workout is yours forever.
            </p>
            <button className="btn-primary" onClick={() => navigate('/signup')}>
              See Full Plan <ArrowForward className="btn-icon" />
            </button>
          </div>
          <div className="daily-preview">
            {dailyPlan.map((day, i) => (
              <div key={i} className={`daily-item ${day.done ? 'daily-item--done' : ''} ${day.active ? 'daily-item--active' : ''}`}>
                <div className="daily-item__check"><DayIcon done={day.done} active={day.active} /></div>
                <div className="daily-item__body">
                  <div className="daily-item__header">
                    <span className="daily-item__time">{day.time}</span>
                    <span className="daily-item__level">{day.level}</span>
                  </div>
                  <span className="daily-item__label">{day.label}</span>
                  <span className="daily-item__duration">{day.duration}</span>
                </div>
              </div>
            ))}
            <div className="daily-unlock-hint">
              <LockOpen className="daily-unlock-icon" />
              <span>Complete all 7 days — unlock every workout to your library</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHALLENGES ───────────────────────────────────────────────────────── */}
      <section className="land-challenges">
        <div className="land-section-label">Compete</div>
        <h2 className="land-section-title">WEEKLY<br /><span className="text-accent">CHALLENGES</span></h2>
        <p className="land-section-sub">Players set the challenge. You prove yourself.</p>
        <div className="challenges-grid">
          {challenges.map((c, i) => (
            <div className="challenge-card" key={i} style={{ '--delay': `${i * 0.1}s` }}>
              <div className="challenge-card__top">
                <span className="challenge-icon">{c.icon}</span>
                <span className="challenge-deadline">{c.deadline}</span>
              </div>
              <h3 className="challenge-title">{c.title}</h3>
              <p className="challenge-player">by {c.player}</p>
              <div className="challenge-bottom">
                <div className="challenge-stat">
                  <span className="challenge-num">{c.participants.toLocaleString()}</span>
                  <span className="challenge-stat-label">Participants</span>
                </div>
                <div className="challenge-reward">
                  <WorkspacePremium className="reward-icon-svg" />
                  <span className="reward-text">{c.reward}</span>
                </div>
              </div>
              <button className="btn-ghost btn-ghost--sm" onClick={() => navigate('/signup')}>Accept Challenge</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section className="land-stats">
        <div className="stats-bg-text">ATLAS</div>
        <div className="stats-grid">
          <div className="stat-block" ref={userRef}>
            <People className="stat-block__icon" />
            <span className="stat-block__num">{userCount >= 1000 ? `${(userCount / 1000).toFixed(1)}k` : userCount}</span>
            <span className="stat-block__label">Active Players</span>
          </div>
          <div className="stat-block" ref={workoutRef}>
            <FitnessCenter className="stat-block__icon" />
            <span className="stat-block__num">{workoutCount}+</span>
            <span className="stat-block__label">Pro Workouts</span>
          </div>
          <div className="stat-block" ref={playerRef}>
            <EmojiEvents className="stat-block__icon" />
            <span className="stat-block__num">{playerCount}</span>
            <span className="stat-block__label">Ambassadors</span>
          </div>
          <div className="stat-block" ref={countryRef}>
            <Public className="stat-block__icon" />
            <span className="stat-block__num">{countryCount}</span>
            <span className="stat-block__label">Countries</span>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="land-cta">
        <div className="cta-glow" />
        <div className="cta-inner">
          <div className="land-section-label">Ready?</div>
          <h2 className="cta-title">YOUR PRO JOURNEY<br />STARTS<span className="text-accent"> NOW</span></h2>
          <p className="cta-sub">
            Join thousands of players training with real Euroleague athletes.<br />
            Free to start. No credit card required.
          </p>
          <div className="cta-actions">
            <button className="btn-primary btn-primary--xl" onClick={() => navigate('/signup')}>
              Create Free Account <ArrowForward className="btn-icon" />
            </button>
            <p className="cta-fine">Launching June 2025 · Limited Early Access Spots</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="land-footer">
        <div className="land-footer__inner">
          <div className="footer-brand">
            <span className="land-nav__logo">ATLAS</span>
            <p>Your official partner to pro basketball success.</p>
          </div>
          <div className="footer-links-group">
            <span className="footer-group-title">Platform</span>
            <button onClick={() => scrollTo(featuresRef)}>Features</button>
            <button onClick={() => scrollTo(howRef)}>How It Works</button>
            <button onClick={() => scrollTo(ambassadorsRef)}>Players</button>
            <button onClick={() => scrollTo(pricingRef)}>Pricing</button>
          </div>
          <div className="footer-links-group">
            <span className="footer-group-title">Company</span>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <a href="#careers">Careers</a>
          </div>
          <div className="footer-links-group">
            <span className="footer-group-title">Legal</span>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>
        <div className="land-footer__bottom">
          <span>© 2025 Atlas Basketball. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingScreen;