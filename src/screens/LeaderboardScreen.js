// src/screens/LeaderboardScreen.js
//
// Reads from Firestore: users collection
// Ranks by XP descending; filters by country, position, age range client-side
//
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  EmojiEvents,
  SportsBasketball,
  Public,
  FilterList,
  WorkspacePremium,
  Person,
  KeyboardArrowDown,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import './LeaderboardScreen.css';

const COUNTRIES = [
  'Argentina', 'Australia', 'Brazil', 'Cameroon', 'Canada', 'China',
  'Croatia', 'France', 'Germany', 'Greece', 'Italy', 'Japan', 'Lithuania',
  'Nigeria', 'Other', 'Philippines', 'Poland', 'Portugal', 'Romania',
  'Russia', 'Serbia', 'Spain', 'Turkey', 'United Kingdom', 'United States',
];

const POSITIONS = ['Guard', 'Forward', 'Center'];

const AGE_RANGES = [
  { label: 'U-18',  test: (a) => a < 18 },
  { label: '18-25', test: (a) => a >= 18 && a <= 25 },
  { label: '26-35', test: (a) => a >= 26 && a <= 35 },
  { label: '35+',   test: (a) => a > 35 },
];

const TIER_COLORS = {
  free:       '#718096',
  pro:        '#00D4AA',
  euroleague: '#FF5A1F',
  nba:        '#667eea',
};

const TIER_LABELS = {
  free: 'Free', pro: 'Pro', euroleague: 'EuroLeague', nba: 'NBA',
};

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_LABELS = ['1ST', '2ND', '3RD'];

// ── XP tier label ─────────────────────────────────────────────────────────────
const xpRank = (xp) => {
  if (xp >= 500) return { label: 'Legend',    color: '#667eea' };
  if (xp >= 200) return { label: 'Elite',     color: '#FF5A1F' };
  if (xp >= 100) return { label: 'Veteran',   color: '#00D4AA' };
  if (xp >= 50)  return { label: 'Rising',    color: '#FFD700' };
  return              { label: 'Rookie',     color: '#718096' };
};

const LeaderboardScreen = () => {
  const navigate = useNavigate();

  const [authUser, setAuthUser]   = useState(null);
  const [userData, setUserData]   = useState(null);
  const [loading, setLoading]     = useState(true);

  const [allPlayers, setAllPlayers]       = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  // Filters
  const [filterCountry,  setFilterCountry]  = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterAge,      setFilterAge]      = useState('');
  const [countryOpen,    setCountryOpen]    = useState(false);

  const countryRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auth + load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setUserData(snap.data());
        await loadPlayers();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const loadPlayers = async () => {
    setPlayersLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      // Sort by XP descending, then alphabetically for ties
      list.sort((a, b) => {
        const diff = (b.xp || 0) - (a.xp || 0);
        if (diff !== 0) return diff;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });
      setAllPlayers(list);
    } catch (e) {
      console.error('Load players error:', e);
    } finally {
      setPlayersLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = allPlayers.filter((p) => {
    if (filterCountry  && p.country  !== filterCountry)  return false;
    if (filterPosition && p.position !== filterPosition) return false;
    if (filterAge) {
      const range = AGE_RANGES.find((r) => r.label === filterAge);
      if (range && !range.test(p.age || 0)) return false;
    }
    return true;
  });

  const ownRank = filtered.findIndex((p) => p.uid === authUser?.uid);

  const clearFilters = () => {
    setFilterCountry('');
    setFilterPosition('');
    setFilterAge('');
  };

  const hasFilters = filterCountry || filterPosition || filterAge;

  const podium = filtered.slice(0, 3);
  const rest   = filtered.slice(3);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="lb-loading">
        <span className="lb-loading-logo">ATLAS</span>
        <div className="lb-spinner" />
      </div>
    );
  }

  return (
    <div className="lb-root">
      <div className="lb-bg">
        <div className="lb-glow lb-glow--1" />
        <div className="lb-glow lb-glow--2" />
        <div className="lb-glow lb-glow--3" />
        <div className="lb-grid" />
      </div>

      <Sidebar userData={userData} onSignOut={handleSignOut} />

      <div className="sb-content-wrap">
        <main className="lb-main">

          {/* ── Page header ───────────────────────────────────────────── */}
          <div className="lb-page-header">
            <div className="lb-eyebrow">
              <EmojiEvents className="lb-eyebrow-icon" />
              Global Rankings
            </div>
            <h1 className="lb-title">LEADERBOARD</h1>
            <p className="lb-sub">
              Ranked by XP — earn more by training, completing challenges and posting highlights.
            </p>
          </div>

          {/* ── Your rank banner ──────────────────────────────────────── */}
          {authUser && ownRank !== -1 && (
            <div className="lb-own-banner">
              <div className="lb-own-banner__left">
                <div
                  className="lb-own-banner__avatar"
                  style={{ background: TIER_COLORS[userData?.tier] || TIER_COLORS.free }}
                >
                  {(userData?.firstName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="lb-own-banner__name">
                    {userData?.firstName} {userData?.lastName}
                  </div>
                  <div className="lb-own-banner__meta">
                    {userData?.position && <span>{userData.position}</span>}
                    {userData?.country && <><span className="lb-sep">·</span><span>{userData.country}</span></>}
                  </div>
                </div>
              </div>
              <div className="lb-own-banner__right">
                <div className="lb-own-banner__stat">
                  <span className="lb-own-banner__val">#{ownRank + 1}</span>
                  <span className="lb-own-banner__key">Rank</span>
                </div>
                <div className="lb-own-banner__divider" />
                <div className="lb-own-banner__stat">
                  <span className="lb-own-banner__val">{userData?.xp || 0}</span>
                  <span className="lb-own-banner__key">XP</span>
                </div>
                <div className="lb-own-banner__divider" />
                <div className="lb-own-banner__stat">
                  <span
                    className="lb-own-banner__val"
                    style={{ color: xpRank(userData?.xp || 0).color }}
                  >
                    {xpRank(userData?.xp || 0).label}
                  </span>
                  <span className="lb-own-banner__key">Title</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Filters ───────────────────────────────────────────────── */}
          <div className="lb-filters">
            <div className="lb-filters__label">
              <FilterList style={{ fontSize: '0.9rem' }} />
              Filter
            </div>

            {/* Country dropdown */}
            <div className="lb-country-wrap" ref={countryRef}>
              <button
                className={`lb-filter-select ${filterCountry ? 'lb-filter-select--active' : ''}`}
                onClick={() => setCountryOpen((o) => !o)}
              >
                <Public style={{ fontSize: '0.85rem' }} />
                {filterCountry || 'All Countries'}
                <KeyboardArrowDown
                  style={{
                    fontSize: '1rem',
                    marginLeft: 'auto',
                    transform: countryOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {countryOpen && (
                <div className="lb-country-dropdown">
                  <button
                    className={`lb-country-opt ${!filterCountry ? 'lb-country-opt--active' : ''}`}
                    onClick={() => { setFilterCountry(''); setCountryOpen(false); }}
                  >
                    All Countries
                  </button>
                  {COUNTRIES.map((c) => (
                    <button
                      key={c}
                      className={`lb-country-opt ${filterCountry === c ? 'lb-country-opt--active' : ''}`}
                      onClick={() => { setFilterCountry(c); setCountryOpen(false); }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Position pills */}
            <div className="lb-pill-group">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  className={`lb-pill ${filterPosition === p ? 'lb-pill--active' : ''}`}
                  onClick={() => setFilterPosition(filterPosition === p ? '' : p)}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Age pills */}
            <div className="lb-pill-group">
              {AGE_RANGES.map((r) => (
                <button
                  key={r.label}
                  className={`lb-pill ${filterAge === r.label ? 'lb-pill--active' : ''}`}
                  onClick={() => setFilterAge(filterAge === r.label ? '' : r.label)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button className="lb-clear-btn" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>

          {/* ── Players count ─────────────────────────────────────────── */}
          <div className="lb-count-row">
            <span className="lb-count">
              {filtered.length} athlete{filtered.length !== 1 ? 's' : ''}
              {hasFilters ? ' matching' : ' worldwide'}
            </span>
          </div>

          {playersLoading ? (
            <div className="lb-list-loading"><div className="lb-spinner lb-spinner--sm" /></div>
          ) : filtered.length === 0 ? (
            <div className="lb-empty">
              <SportsBasketball className="lb-empty-icon" />
              <p>No players match these filters.</p>
              <button className="lb-clear-btn lb-clear-btn--center" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* ── Podium (top 3) ─────────────────────────────────── */}
              {podium.length >= 1 && (
                <div className="lb-podium">
                  {/* Reorder: 2nd left, 1st center, 3rd right */}
                  {[
                    podium[1] ? { player: podium[1], rank: 2 } : null,
                    { player: podium[0], rank: 1 },
                    podium[2] ? { player: podium[2], rank: 3 } : null,
                  ]
                    .filter(Boolean)
                    .map(({ player, rank }) => {
                      const isOwn      = player.uid === authUser?.uid;
                      const tierColor  = TIER_COLORS[player.tier] || TIER_COLORS.free;
                      const medalColor = MEDAL_COLORS[rank - 1];
                      const xrk        = xpRank(player.xp || 0);
                      return (
                        <div
                          key={player.uid}
                          className={`lb-podium-card lb-podium-card--${rank} ${isOwn ? 'lb-podium-card--own' : ''}`}
                        >
                          {isOwn && <div className="lb-you-tag">YOU</div>}

                          <div
                            className="lb-podium-avatar"
                            style={{ background: tierColor, boxShadow: `0 0 20px ${medalColor}55` }}
                          >
                            {(player.firstName || '?').charAt(0).toUpperCase()}
                          </div>

                          <div className="lb-podium-medal" style={{ color: medalColor }}>
                            {rank === 1
                              ? <EmojiEvents style={{ fontSize: '1.4rem' }} />
                              : <WorkspacePremium style={{ fontSize: '1.1rem' }} />}
                            <span>{MEDAL_LABELS[rank - 1]}</span>
                          </div>

                          <div className="lb-podium-name">
                            {player.firstName} {player.lastName}
                          </div>

                          <div className="lb-podium-meta">
                            {player.position && <span>{player.position}</span>}
                            {player.country && (
                              <>
                                <span className="lb-sep">·</span>
                                <span>{player.country}</span>
                              </>
                            )}
                          </div>

                          <div className="lb-podium-xp" style={{ color: medalColor }}>
                            {player.xp || 0} <span className="lb-podium-xp__unit">XP</span>
                          </div>

                          <div className="lb-podium-rank-label" style={{ color: xrk.color }}>
                            {xrk.label}
                          </div>

                          {player.tier && player.tier !== 'free' && (
                            <div
                              className="lb-podium-tier"
                              style={{ color: tierColor, borderColor: `${tierColor}44` }}
                            >
                              {TIER_LABELS[player.tier]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ── Full ranked list ───────────────────────────────── */}
              {rest.length > 0 && (
                <div className="lb-list">
                  {rest.map((player, idx) => {
                    const rank    = idx + 4;
                    const isOwn   = player.uid === authUser?.uid;
                    const tierColor = TIER_COLORS[player.tier] || TIER_COLORS.free;
                    const xrk     = xpRank(player.xp || 0);

                    return (
                      <div
                        key={player.uid}
                        className={`lb-row ${isOwn ? 'lb-row--own' : ''}`}
                        id={isOwn ? 'lb-own-row' : undefined}
                      >
                        <span className="lb-row__rank">#{rank}</span>

                        <div
                          className="lb-row__avatar"
                          style={{ background: tierColor }}
                        >
                          {(player.firstName || '?').charAt(0).toUpperCase()}
                        </div>

                        <div className="lb-row__info">
                          <div className="lb-row__name">
                            {player.firstName} {player.lastName}
                            {isOwn && <span className="lb-row__you">YOU</span>}
                          </div>
                          <div className="lb-row__meta">
                            {player.position && <span>{player.position}</span>}
                            {player.country && (
                              <>
                                <span className="lb-sep">·</span>
                                <span>{player.country}</span>
                              </>
                            )}
                            {player.age && (
                              <>
                                <span className="lb-sep">·</span>
                                <span>{player.age}y</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="lb-row__right">
                          <div className="lb-row__xp">
                            {player.xp || 0}
                            <span className="lb-row__xp-unit">XP</span>
                          </div>
                          <div
                            className="lb-row__title"
                            style={{ color: xrk.color }}
                          >
                            {xrk.label}
                          </div>
                        </div>

                        {player.tier && player.tier !== 'free' && (
                          <div
                            className="lb-row__tier"
                            style={{ color: tierColor, borderColor: `${tierColor}44` }}
                          >
                            {TIER_LABELS[player.tier]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── XP key ──────────────────────────────────────────────── */}
          <div className="lb-xp-key">
            <div className="lb-xp-key__title">XP Titles</div>
            <div className="lb-xp-key__grid">
              {[
                { label: 'Rookie',   range: '0–49 XP',   color: '#718096' },
                { label: 'Rising',   range: '50–99 XP',  color: '#FFD700' },
                { label: 'Veteran',  range: '100–199 XP',color: '#00D4AA' },
                { label: 'Elite',    range: '200–499 XP',color: '#FF5A1F' },
                { label: 'Legend',   range: '500+ XP',   color: '#667eea' },
              ].map((t) => (
                <div key={t.label} className="lb-xp-key__item">
                  <span className="lb-xp-key__dot" style={{ background: t.color }} />
                  <span className="lb-xp-key__name" style={{ color: t.color }}>{t.label}</span>
                  <span className="lb-xp-key__range">{t.range}</span>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default LeaderboardScreen;