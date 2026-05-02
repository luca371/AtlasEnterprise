// src/screens/ChallengeScreen.js
//
// SETUP FIREBASE STORAGE — adaugă în firebase.js:
//   import { getStorage } from 'firebase/storage';
//   export const storage = getStorage(app);
//
// SETUP FIRESTORE:
//   1. Creează documentul weekly_challenge/current cu câmpurile:
//      videoUrl, title, description, ambassadorName, deadline
//   2. Colecția challenge_submissions se creează automat la primul upload
//
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import {
  EmojiEvents,
  FavoriteBorder,
  Favorite,
  CloudUpload,
  CheckCircle,
  AccessTime,
  Person,
  PlayArrow,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import './ChallengeScreen.css';

const MAX_VIDEO_SIZE_MB = 100;

const ChallengeScreen = () => {
  const navigate = useNavigate();

  // Auth
  const [authUser, setAuthUser]   = useState(null);
  const [userData, setUserData]   = useState(null);
  const [loading, setLoading]     = useState(true);

  // Challenge data
  const [challenge, setChallenge] = useState(null);

  // Submissions
  const [submissions, setSubmissions]       = useState([]);
  const [mySubmission, setMySubmission]     = useState(null);
  const [subLoading, setSubLoading]         = useState(false);

  // Upload state
  const [uploadFile, setUploadFile]         = useState(null);
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError]       = useState('');

  // Likes loading state
  const [likingId, setLikingId] = useState(null);

  const fileInputRef = useRef(null);

  // ── Auth + data load ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) setUserData(userSnap.data());

        // Load challenge
        const challengeSnap = await getDoc(doc(db, 'weekly_challenge', 'current'));
        if (challengeSnap.exists()) setChallenge(challengeSnap.data());

        // Load submissions
        await loadSubmissions(user.uid);
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const loadSubmissions = async (uid) => {
    setSubLoading(true);
    try {
      const q = query(
        collection(db, 'challenge_submissions'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubmissions(all);

      // Check if current user already submitted
      const mine = all.find((s) => s.userId === uid);
      if (mine) setMySubmission(mine);
    } catch (e) {
      console.error('Submissions load error:', e);
    } finally {
      setSubLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a video file.');
      return;
    }

    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_VIDEO_SIZE_MB) {
      setUploadError(`Video must be under ${MAX_VIDEO_SIZE_MB}MB. Yours is ${sizeMB.toFixed(0)}MB.`);
      return;
    }

    setUploadError('');
    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile || !authUser) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const ext      = uploadFile.name.split('.').pop();
      const filePath = `challenge_submissions/${authUser.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, filePath);
      const task     = uploadBytesResumable(storageRef, uploadFile);

      await new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(pct);
          },
          reject,
          resolve
        );
      });

      const downloadUrl = await getDownloadURL(storageRef);

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'challenge_submissions'), {
        userId:    authUser.uid,
        userName:  userData?.firstName
          ? `${userData.firstName} ${userData.lastName || ''}`.trim()
          : authUser.email?.split('@')[0] || 'Athlete',
        videoUrl:  downloadUrl,
        likedBy:   [],
        createdAt: serverTimestamp(),
      });

      const newSubmission = {
        id:        docRef.id,
        userId:    authUser.uid,
        userName:  userData?.firstName
          ? `${userData.firstName} ${userData.lastName || ''}`.trim()
          : authUser.email?.split('@')[0] || 'Athlete',
        videoUrl:  downloadUrl,
        likedBy:   [],
      };

      setMySubmission(newSubmission);
      setSubmissions((prev) => [newSubmission, ...prev]);
      setUploadFile(null);
    } catch (e) {
      console.error('Upload error:', e);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Like / Unlike ─────────────────────────────────────────────────────────
  const handleLike = async (submission) => {
    if (!authUser) return;
    if (submission.userId === authUser.uid) return; // can't like own post
    if (likingId === submission.id) return; // debounce

    setLikingId(submission.id);

    const isLiked    = submission.likedBy?.includes(authUser.uid);
    const docRef     = doc(db, 'challenge_submissions', submission.id);
    const updateOp   = isLiked
      ? arrayRemove(authUser.uid)
      : arrayUnion(authUser.uid);

    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submission.id
          ? {
              ...s,
              likedBy: isLiked
                ? s.likedBy.filter((id) => id !== authUser.uid)
                : [...(s.likedBy || []), authUser.uid],
            }
          : s
      )
    );

    try {
      await updateDoc(docRef, { likedBy: updateOp });
    } catch (e) {
      // Revert on error
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id ? submission : s
        )
      );
    } finally {
      setLikingId(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="ch-loading">
        <div className="ch-loading-logo">ATLAS</div>
        <div className="ch-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="ch-root">
      <div className="ch-bg">
        <div className="ch-glow ch-glow--1" />
        <div className="ch-glow ch-glow--2" />
        <div className="ch-grid" />
      </div>

      <Sidebar userData={userData} onSignOut={handleSignOut} />

      <div className="sb-content-wrap">
        <main className="ch-main">

          {/* ── Page header ────────────────────────────────────────────────── */}
          <div className="ch-page-header">
            <div className="ch-page-header__eyebrow">
              <EmojiEvents className="ch-eyebrow-icon" />
              Weekly Challenge
            </div>
            <h1 className="ch-page-title">
              {challenge?.title || 'WEEKLY CHALLENGE'}
            </h1>
            {challenge && (
              <div className="ch-meta-row">
                {challenge.ambassadorName && (
                  <span className="ch-meta-tag">
                    <Person style={{ fontSize: '0.85rem' }} />
                    Set by {challenge.ambassadorName}
                  </span>
                )}
                {challenge.deadline && (
                  <span className="ch-meta-tag ch-meta-tag--deadline">
                    <AccessTime style={{ fontSize: '0.85rem' }} />
                    {challenge.deadline}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Challenge video (set by admin in Firebase) ──────────────────── */}
          {challenge?.videoUrl ? (
            <section className="ch-video-section">
              <div className="ch-section-label">Challenge Video</div>
              <div className="ch-challenge-video-wrap">
                <video
                  className="ch-challenge-video"
                  src={challenge.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
              {challenge.description && (
                <p className="ch-challenge-desc">{challenge.description}</p>
              )}
            </section>
          ) : (
            <section className="ch-video-section ch-video-section--empty">
              <div className="ch-empty-video">
                <PlayArrow className="ch-empty-icon" />
                <p>Challenge video coming soon</p>
              </div>
            </section>
          )}

          {/* ── Submit your attempt ─────────────────────────────────────────── */}
          <section className="ch-upload-section">
            <div className="ch-section-label">Your Submission</div>

            {mySubmission ? (
              /* Already submitted */
              <div className="ch-submitted-card">
                <CheckCircle className="ch-submitted-icon" />
                <div>
                  <strong>You've submitted your attempt!</strong>
                  <p>Your video is live in the community feed below.</p>
                </div>
                <div className="ch-submitted-preview">
                  <video
                    src={mySubmission.videoUrl}
                    className="ch-submitted-video"
                    playsInline
                    preload="metadata"
                  />
                  <span className="ch-submitted-label">Your video</span>
                </div>
              </div>
            ) : (
              /* Upload form */
              <div className="ch-upload-card">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {!uploadFile ? (
                  <button
                    className="ch-upload-trigger"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CloudUpload className="ch-upload-trigger__icon" />
                    <span className="ch-upload-trigger__label">Upload your attempt</span>
                    <span className="ch-upload-trigger__sub">MP4, MOV, AVI · Max {MAX_VIDEO_SIZE_MB}MB</span>
                  </button>
                ) : (
                  <div className="ch-upload-ready">
                    <div className="ch-upload-file-info">
                      <span className="ch-upload-filename">{uploadFile.name}</span>
                      <span className="ch-upload-filesize">
                        {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>

                    {uploading ? (
                      <div className="ch-progress-wrap">
                        <div className="ch-progress-bar">
                          <div
                            className="ch-progress-bar__fill"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="ch-progress-text">{uploadProgress}%</span>
                      </div>
                    ) : (
                      <div className="ch-upload-actions">
                        <button
                          className="ch-btn-upload"
                          onClick={handleUpload}
                        >
                          <CloudUpload style={{ fontSize: '1rem' }} />
                          Submit Video
                        </button>
                        <button
                          className="ch-btn-cancel"
                          onClick={() => { setUploadFile(null); setUploadError(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="ch-upload-error">{uploadError}</div>
                )}

                <p className="ch-upload-note">
                  Each player can submit one video per challenge.
                </p>
              </div>
            )}
          </section>

          {/* ── Community submissions feed ───────────────────────────────────── */}
          <section className="ch-feed-section">
            <div className="ch-feed-header">
              <div className="ch-section-label">Community</div>
              <h2 className="ch-feed-title">
                {submissions.length} SUBMISSION{submissions.length !== 1 ? 'S' : ''}
              </h2>
            </div>

            {subLoading ? (
              <div className="ch-feed-loading">
                <div className="ch-loading-spinner" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="ch-feed-empty">
                <EmojiEvents className="ch-feed-empty__icon" />
                <p>No submissions yet. Be the first to upload your attempt to Atlas!</p>
              </div>
            ) : (
              <div className="ch-feed-grid">
                {submissions.map((submission) => {
                  const isOwn    = submission.userId === authUser?.uid;
                  const isLiked  = submission.likedBy?.includes(authUser?.uid);
                  const likeCount = submission.likedBy?.length || 0;

                  return (
                    <div
                      key={submission.id}
                      className={`ch-card ${isOwn ? 'ch-card--own' : ''}`}
                    >
                      {isOwn && (
                        <div className="ch-card__own-badge">Your Submission</div>
                      )}

                      {/* Video */}
                      <div className="ch-card__video-wrap">
                        <video
                          className="ch-card__video"
                          src={submission.videoUrl}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </div>

                      {/* Footer */}
                      <div className="ch-card__footer">
                        <div className="ch-card__user">
                          <div className="ch-card__avatar">
                            {(submission.userName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <span className="ch-card__username">
                            {submission.userName || 'Athlete'}
                          </span>
                        </div>

                        <button
                          className={`ch-like-btn ${isLiked ? 'ch-like-btn--liked' : ''} ${isOwn ? 'ch-like-btn--disabled' : ''}`}
                          onClick={() => !isOwn && handleLike(submission)}
                          disabled={isOwn || likingId === submission.id}
                          title={isOwn ? "You can't like your own submission" : isLiked ? 'Unlike' : 'Like'}
                        >
                          {isLiked
                            ? <Favorite className="ch-like-btn__icon" />
                            : <FavoriteBorder className="ch-like-btn__icon" />
                          }
                          <span className="ch-like-btn__count">{likeCount}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
};

export default ChallengeScreen;