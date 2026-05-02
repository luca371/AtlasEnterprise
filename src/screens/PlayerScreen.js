// src/screens/PlayerScreen.js
//
// FIRESTORE COLLECTION: player_games
//   Fields: userId, userName, points, rebounds, assists,
//           efficiency, plusMinus, minutesPlayed, mediaUrl,
//           mediaType ('image'|'video'), gameDate, createdAt
//
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, addDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import {
  BarChart,
  Add,
  Close,
  CloudUpload,
  SportsBasketball,
  EmojiEvents,
  Image as ImageIcon,
  Videocam,
  CalendarMonth,
  ArrowBack,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import './PlayerScreen.css';

const MAX_FILE_MB = 150;

const STAT_FIELDS = [
  { key: 'points',       label: 'PTS',  full: 'Points',         min: 0,    max: 100, step: 1  },
  { key: 'rebounds',     label: 'REB',  full: 'Rebounds',       min: 0,    max: 50,  step: 1  },
  { key: 'assists',      label: 'AST',  full: 'Assists',        min: 0,    max: 50,  step: 1  },
  { key: 'efficiency',   label: 'EFF',  full: 'Efficiency',     min: -30,  max: 100, step: 1  },
  { key: 'plusMinus',    label: '+/-',  full: '+/- Rating',     min: -60,  max: 60,  step: 1  },
  { key: 'minutesPlayed',label: 'MIN',  full: 'Minutes Played', min: 0,    max: 60,  step: 1  },
];

const EMPTY_FORM = {
  points: '',
  rebounds: '',
  assists: '',
  efficiency: '',
  plusMinus: '',
  minutesPlayed: '',
  gameDate: new Date().toISOString().split('T')[0],
};

const avg = (games, key) => {
  if (!games.length) return 0;
  const sum = games.reduce((acc, g) => acc + (Number(g[key]) || 0), 0);
  return (sum / games.length).toFixed(1);
};

const TIER_COLORS = {
  free:       '#718096',
  pro:        '#00D4AA',
  euroleague: '#FF5A1F',
  nba:        '#667eea',
};

const PlayerScreen = () => {
  const navigate            = useNavigate();
  const { userId: paramUid } = useParams();         // undefined on /player

  const [authUser, setAuthUser]   = useState(null);
  const [userData, setUserData]   = useState(null);   // logged-in user data
  const [profileData, setProfileData] = useState(null); // profile being viewed
  const [loading, setLoading]     = useState(true);

  const [games, setGames]         = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving]       = useState(false);

  const [uploadFile, setUploadFile]   = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Preview URL lifecycle
  useEffect(() => {
    if (!uploadFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(uploadFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);

  // ── Auth + load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);

      try {
        // Load own user data (for sidebar + permission checks)
        const ownSnap = await getDoc(doc(db, 'users', user.uid));
        if (ownSnap.exists()) setUserData(ownSnap.data());

        // Determine which profile to load
        const targetUid = paramUid || user.uid;

        if (targetUid !== user.uid) {
          // Load external profile
          const profileSnap = await getDoc(doc(db, 'users', targetUid));
          if (profileSnap.exists()) {
            setProfileData({ uid: targetUid, ...profileSnap.data() });
          } else {
            setProfileData({ uid: targetUid, firstName: 'Athlete', lastName: '' });
          }
        } else {
          setProfileData(null); // own profile — use userData
        }

        await loadGames(targetUid);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate, paramUid]);

  const isOwnProfile  = authUser && (!paramUid || paramUid === authUser.uid);
  const displayData   = isOwnProfile ? userData : profileData;
  const displayName   = displayData
    ? `${displayData.firstName || ''} ${displayData.lastName || ''}`.trim() || 'Athlete'
    : 'Athlete';
  const tierColor     = TIER_COLORS[displayData?.tier] || TIER_COLORS.free;

  // ── Load games ────────────────────────────────────────────────────────────
  const loadGames = async (uid) => {
    setGamesLoading(true);
    try {
      // No orderBy — avoids needing a composite Firestore index.
      // Sort client-side by gameDate descending instead.
      const q = query(
        collection(db, 'player_games'),
        where('userId', '==', uid)
      );
      const snap = await getDocs(q);
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => (b.gameDate || '').localeCompare(a.gameDate || ''));
      setGames(all);
    } catch (e) {
      console.error('Load games error:', e);
    } finally {
      setGamesLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openModal = () => {
    setForm(EMPTY_FORM);
    setUploadFile(null);
    setFormError('');
    setUploadProgress(0);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setUploadFile(null);
    setFormError('');
  };

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) { setFormError('Select a video or image file.'); return; }
    if (file.size / 1024 / 1024 > MAX_FILE_MB) { setFormError(`File must be under ${MAX_FILE_MB}MB.`); return; }
    setFormError('');
    setUploadFile(file);
  };

  // ── Save game ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validate required numeric fields
    const missing = STAT_FIELDS.filter((f) => form[f.key] === '' || form[f.key] === undefined);
    if (missing.length) {
      setFormError(`Please fill in: ${missing.map((f) => f.full).join(', ')}`);
      return;
    }

    setSaving(true);
    setFormError('');
    setUploadProgress(0);

    try {
      let mediaUrl  = null;
      let mediaType = null;

      if (uploadFile) {
        const isVideo = uploadFile.type.startsWith('video/');
        const ext     = uploadFile.name.split('.').pop();
        const path    = `player_games/${authUser.uid}_${Date.now()}.${ext}`;
        const sRef    = ref(storage, path);
        const task    = uploadBytesResumable(sRef, uploadFile);

        await new Promise((resolve, reject) => {
          task.on(
            'state_changed',
            (s) => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            reject,
            resolve,
          );
        });

        mediaUrl  = await getDownloadURL(sRef);
        mediaType = isVideo ? 'video' : 'image';
      }

      const gameDoc = {
        userId:       authUser.uid,
        userName:     displayName,
        points:       Number(form.points),
        rebounds:     Number(form.rebounds),
        assists:      Number(form.assists),
        efficiency:   Number(form.efficiency),
        plusMinus:    Number(form.plusMinus),
        minutesPlayed:Number(form.minutesPlayed),
        gameDate:     form.gameDate,
        mediaUrl,
        mediaType,
        createdAt:    serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'player_games'), gameDoc);

      setGames((prev) => [{ id: docRef.id, ...gameDoc }, ...prev]);
      closeModal();
    } catch (e) {
      console.error('Save game error:', e);
      setFormError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Averages ──────────────────────────────────────────────────────────────
  const averages = STAT_FIELDS.map((f) => ({
    ...f,
    value: avg(games, f.key),
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pl-loading">
        <span className="pl-loading-logo">ATLAS</span>
        <div className="pl-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="pl-root">
      {/* Background */}
      <div className="pl-bg">
        <div className="pl-glow pl-glow--1" />
        <div className="pl-glow pl-glow--2" />
        <div className="pl-grid" />
      </div>

      <Sidebar userData={userData} onSignOut={handleSignOut} />

      <div className="sb-content-wrap">
        <main className="pl-main">

          {/* ── Header ─────────────────────────────────────────────────── */}
          {!isOwnProfile && (
            <button className="pl-back-btn" onClick={() => navigate(-1)}>
              <ArrowBack style={{ fontSize: '1rem' }} />
              Back
            </button>
          )}

          <div className="pl-page-header">
            <div className="pl-page-header__eyebrow">
              <BarChart className="pl-eyebrow-icon" />
              Player Section
            </div>

            <div className="pl-profile-row">
              <div className="pl-avatar" style={{ background: tierColor }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="pl-profile-info">
                <h1 className="pl-page-title">{displayName.toUpperCase()}</h1>
                <div className="pl-profile-meta">
                  <SportsBasketball style={{ fontSize: '0.75rem', color: tierColor }} />
                  <span style={{ color: tierColor, fontSize: '0.8rem', fontWeight: 600 }}>
                    {(displayData?.tier || 'free').toUpperCase()}
                  </span>
                  <span className="pl-meta-sep">·</span>
                  <span className="pl-meta-sep">{displayData?.country || 'Unknown'}</span>
                  <span className="pl-meta-sep">·</span>
                  <span className="pl-meta-sep">{displayData?.position || 'Unknown'}</span>
                  <span className="pl-meta-sep">·</span>
                  <span className="pl-meta-sep">{displayData?.age || 'Unknown'}</span>
                  <span className="pl-meta-sep">·</span>
                  <span className="pl-meta-sep">{displayData?.gender || 'Unknown'}</span>
                  <span className="pl-games-count">{games.length} game{games.length !== 1 ? 's' : ''} logged</span>
                </div>
              </div>
              {isOwnProfile && (
                <button className="pl-add-btn" onClick={openModal}>
                  <Add style={{ fontSize: '1.1rem' }} />
                  Add Game
                </button>
              )}
            </div>
          </div>

          {/* ── Averages ───────────────────────────────────────────────── */}
          <section className="pl-section">
            <div className="pl-section-label">
              <EmojiEvents style={{ fontSize: '0.9rem', color: '#FF5A1F' }} />
              Average Stats Per Game
            </div>

            {games.length === 0 ? (
              <div className="pl-empty-stats">
                <SportsBasketball className="pl-empty-icon" />
                <p>No games logged yet.</p>
                {isOwnProfile && (
                  <button className="pl-add-btn pl-add-btn--center" onClick={openModal}>
                    <Add style={{ fontSize: '1rem' }} />
                    Log Your First Game
                  </button>
                )}
              </div>
            ) : (
              <div className="pl-averages-grid">
                {averages.map((s) => (
                  <div key={s.key} className="pl-avg-card">
                    <span className="pl-avg-card__value">
                      {s.key === 'plusMinus' && Number(s.value) > 0 ? '+' : ''}
                      {s.value}
                    </span>
                    <span className="pl-avg-card__label">{s.label}</span>
                    <span className="pl-avg-card__full">{s.full}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Games list ─────────────────────────────────────────────── */}
          {games.length > 0 && (
            <section className="pl-section">
              <div className="pl-section-label">
                <CalendarMonth style={{ fontSize: '0.9rem', color: '#00D4AA' }} />
                Game Log — {games.length} game{games.length !== 1 ? 's' : ''}
              </div>

              {gamesLoading ? (
                <div className="pl-games-loading"><div className="pl-loading-spinner pl-loading-spinner--sm" /></div>
              ) : (
                <div className="pl-games-list">
                  {games.map((game, idx) => {
                    const dateStr = game.gameDate
                      ? new Date(game.gameDate + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })
                      : '';

                    return (
                      <div key={game.id} className="pl-game-card">
                        <div className="pl-game-card__index">#{games.length - idx}</div>

                        <div className="pl-game-card__body">
                          <div className="pl-game-card__date">
                            <CalendarMonth style={{ fontSize: '0.75rem' }} />
                            {dateStr}
                          </div>

                          <div className="pl-game-stats-row">
                            {STAT_FIELDS.map((f) => (
                              <div key={f.key} className="pl-game-stat">
                                <span className="pl-game-stat__val">
                                  {f.key === 'plusMinus' && Number(game[f.key]) > 0 ? '+' : ''}
                                  {game[f.key] ?? '—'}
                                </span>
                                <span className="pl-game-stat__label">{f.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {game.mediaUrl && (
                          <div className="pl-game-card__media">
                            {game.mediaType === 'video' ? (
                              <video
                                src={game.mediaUrl}
                                className="pl-game-media"
                                controls
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={game.mediaUrl}
                                className="pl-game-media"
                                alt="Game clip"
                              />
                            )}
                            <div className="pl-game-media-badge">
                              {game.mediaType === 'video'
                                ? <Videocam style={{ fontSize: '0.7rem' }} />
                                : <ImageIcon style={{ fontSize: '0.7rem' }} />}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </main>
      </div>

      {/* ── Add Game Modal ──────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="pl-modal-overlay" onClick={closeModal}>
          <div className="pl-modal" onClick={(e) => e.stopPropagation()}>

            <div className="pl-modal__header">
              <div className="pl-modal__title">
                <SportsBasketball style={{ fontSize: '1.1rem', color: '#FF5A1F' }} />
                Log New Game
              </div>
              <button className="pl-modal__close" onClick={closeModal} disabled={saving}>
                <Close />
              </button>
            </div>

            <div className="pl-modal__body">

              {/* Date */}
              <div className="pl-field">
                <label className="pl-field__label">Game Date</label>
                <input
                  type="date"
                  className="pl-field__input"
                  value={form.gameDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleFormChange('gameDate', e.target.value)}
                />
              </div>

              {/* Stat grid */}
              <div className="pl-stats-form-grid">
                {STAT_FIELDS.map((f) => (
                  <div key={f.key} className="pl-field">
                    <label className="pl-field__label">{f.full}</label>
                    <input
                      type="number"
                      className="pl-field__input pl-field__input--stat"
                      placeholder={f.label}
                      value={form[f.key]}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      onChange={(e) => handleFormChange(f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* File upload */}
              <div className="pl-field">
                <label className="pl-field__label">Game Clip / Photo <span className="pl-field__optional">(optional)</span></label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {!uploadFile ? (
                  <button
                    className="pl-upload-trigger"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    <CloudUpload style={{ fontSize: '1.4rem' }} />
                    <span>Upload video or photo</span>
                    <span className="pl-upload-trigger__sub">MP4, MOV, JPG, PNG · Max {MAX_FILE_MB}MB</span>
                  </button>
                ) : (
                  <div className="pl-upload-preview-wrap">
                    {uploadFile.type.startsWith('video/') ? (
                      <video
                        src={previewUrl}
                        className="pl-upload-preview-media"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        className="pl-upload-preview-media"
                        alt="preview"
                      />
                    )}
                    <div className="pl-upload-preview-info">
                      {uploadFile.type.startsWith('video/')
                        ? <Videocam style={{ fontSize: '0.85rem' }} />
                        : <ImageIcon style={{ fontSize: '0.85rem' }} />}
                      {(uploadFile.size / 1024 / 1024).toFixed(1)}MB
                      <button
                        className="pl-upload-remove"
                        onClick={() => { setUploadFile(null); setFormError(''); }}
                        disabled={saving}
                      >
                        <Close style={{ fontSize: '0.8rem' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload progress */}
              {saving && uploadFile && (
                <div className="pl-progress-wrap">
                  <div className="pl-progress-bar">
                    <div className="pl-progress-bar__fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="pl-progress-text">{uploadProgress}%</span>
                </div>
              )}

              {formError && <div className="pl-form-error">{formError}</div>}

            </div>

            <div className="pl-modal__footer">
              <button className="pl-modal__cancel" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="pl-modal__save" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="pl-btn-spinner" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Add style={{ fontSize: '1rem' }} />
                    Save Game
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerScreen;