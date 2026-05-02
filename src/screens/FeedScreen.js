// src/screens/FeedScreen.js
//
// FIRESTORE COLLECTION: feed_posts
//   Fields: userId, userName, mediaUrl, mediaType ('video'|'image'),
//           caption, likedBy[], createdAt
//
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, where, arrayUnion, arrayRemove,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { awardXP, checkLikeMilestone } from '../utils/xpUtils';
import {
  DynamicFeed,
  CloudUpload,
  FavoriteBorder,
  Favorite,
  LockOutlined,
  PlayArrow,
  Image as ImageIcon,
  Videocam,
  EmojiEvents,
  WorkspacePremium,
} from '@mui/icons-material';
import Sidebar from '../components/Sidebar';
import './FeedScreen.css';

const MAX_FILE_MB  = 150;
const TIER_ORDER   = { free: 0, pro: 1, euroleague: 2, nba: 3 };
const isPro        = (tier) => TIER_ORDER[tier] >= TIER_ORDER['pro'];

const FeedScreen = () => {
  const navigate = useNavigate();

  const [authUser, setAuthUser]   = useState(null);
  const [userData, setUserData]   = useState(null);
  const [loading, setLoading]     = useState(true);

  const [posts, setPosts]         = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [postedToday, setPostedToday] = useState(false);

  const [uploadFile, setUploadFile]     = useState(null);
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [caption, setCaption]           = useState('');
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError]   = useState('');

  const [likingId, setLikingId] = useState(null);

  const fileInputRef = useRef(null);

  // Create preview URL once when file is picked — revoke on cleanup to avoid memory leaks
  useEffect(() => {
    if (!uploadFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(uploadFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setUserData(snap.data());
        await loadFeed(user.uid);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  // ── Load feed ─────────────────────────────────────────────────────────────
  const loadFeed = async (uid) => {
    setFeedLoading(true);
    try {
      const q = query(collection(db, 'feed_posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(all);

      // Check if user posted today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const myTodayPost = all.find((p) => {
        if (p.userId !== uid) return false;
        const ts = p.createdAt?.toDate?.();
        return ts && ts >= todayStart;
      });
      setPostedToday(!!myTodayPost);
    } catch (e) {
      console.error('Feed load error:', e);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  // ── File pick ─────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      setUploadError('Select a video or image file.');
      return;
    }
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_FILE_MB) {
      setUploadError(`File must be under ${MAX_FILE_MB}MB.`);
      return;
    }
    setUploadError('');
    setUploadFile(file);
  };

  // ── Upload + post ─────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!uploadFile || !authUser) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const isVideo = uploadFile.type.startsWith('video/');
      const ext     = uploadFile.name.split('.').pop();
      const path    = `feed_posts/${authUser.uid}_${Date.now()}.${ext}`;
      const sRef    = ref(storage, path);
      const task    = uploadBytesResumable(sRef, uploadFile);

      await new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (s) => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
          reject, resolve
        );
      });

      const mediaUrl = await getDownloadURL(sRef);
      const userName = userData?.firstName
        ? `${userData.firstName} ${userData.lastName || ''}`.trim()
        : authUser.email?.split('@')[0] || 'Athlete';

      const docRef = await addDoc(collection(db, 'feed_posts'), {
        userId:    authUser.uid,
        userName,
        mediaUrl,
        mediaType: isVideo ? 'video' : 'image',
        caption:   caption.trim(),
        likedBy:   [],
        createdAt: serverTimestamp(),
      });

      const newPost = {
        id: docRef.id, userId: authUser.uid, userName,
        mediaUrl, mediaType: isVideo ? 'video' : 'image',
        caption: caption.trim(), likedBy: [],
      };

      setPosts((prev) => [newPost, ...prev]);
      setPostedToday(true);
      setUploadFile(null);
      setCaption('');

      // Award 1 XP for feed post
      await awardXP(authUser.uid, 1);
    } catch (e) {
      console.error('Post error:', e);
      setUploadError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Like ──────────────────────────────────────────────────────────────────
  const handleLike = async (post) => {
    if (!authUser || post.userId === authUser.uid || likingId === post.id) return;
    setLikingId(post.id);
    const isLiked = post.likedBy?.includes(authUser.uid);
    setPosts((prev) => prev.map((p) =>
      p.id !== post.id ? p : {
        ...p,
        likedBy: isLiked
          ? p.likedBy.filter((id) => id !== authUser.uid)
          : [...(p.likedBy || []), authUser.uid],
      }
    ));
    try {
      await updateDoc(doc(db, 'feed_posts', post.id), {
        likedBy: isLiked ? arrayRemove(authUser.uid) : arrayUnion(authUser.uid),
      });
      // Check 10-likes milestone XP (only when liking, not unliking)
      if (!isLiked) await checkLikeMilestone(authUser.uid);
    } catch { await loadFeed(authUser.uid); }
    finally { setLikingId(null); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fd-loading">
        <div className="fd-loading-logo">ATLAS</div>
        <div className="fd-loading-spinner" />
      </div>
    );
  }

  const tier    = userData?.tier || 'free';
  const canPost = isPro(tier);

  // ── Upgrade wall ──────────────────────────────────────────────────────────
  if (!canPost) {
    return (
      <div className="fd-root">
        <div className="fd-bg">
          <div className="fd-glow fd-glow--1" />
          <div className="fd-glow fd-glow--2" />
          <div className="fd-grid" />
        </div>
        <Sidebar userData={userData} onSignOut={handleSignOut} />
        <div className="sb-content-wrap">
          <main className="fd-main">
            <div className="fd-gate">
              <div className="fd-gate__icon">
                <LockOutlined />
              </div>
              <h1 className="fd-gate__title">Community Feed</h1>
              <p className="fd-gate__sub">
                The feed is available for <strong>Pro</strong> members and above.<br />
                Upgrade to share your highlights with the Atlas community.
              </p>
              <div className="fd-gate__tiers">
                <div className="fd-tier-card fd-tier-card--pro">
                  <WorkspacePremium className="fd-tier-card__icon" />
                  <span className="fd-tier-card__name">Pro</span>
                  <span className="fd-tier-card__unlock">Unlocks Feed</span>
                </div>
                <div className="fd-tier-card fd-tier-card--euro">
                  <EmojiEvents className="fd-tier-card__icon" />
                  <span className="fd-tier-card__name">EuroLeague</span>
                  <span className="fd-tier-card__unlock">Unlocks Feed</span>
                </div>
                <div className="fd-tier-card fd-tier-card--nba">
                  <EmojiEvents className="fd-tier-card__icon" />
                  <span className="fd-tier-card__name">NBA</span>
                  <span className="fd-tier-card__unlock">Unlocks Feed</span>
                </div>
              </div>
              <button className="fd-gate__cta" onClick={() => navigate('/settings')}>
                Upgrade Plan
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const fileIsVideo = uploadFile?.type?.startsWith('video/');

  return (
    <div className="fd-root">
      <div className="fd-bg">
        <div className="fd-glow fd-glow--1" />
        <div className="fd-glow fd-glow--2" />
        <div className="fd-grid" />
      </div>

      <Sidebar userData={userData} onSignOut={handleSignOut} />

      <div className="sb-content-wrap">
        <main className="fd-main">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="fd-page-header">
            <div className="fd-page-header__eyebrow">
              <DynamicFeed className="fd-eyebrow-icon" />
              Community Feed
            </div>
            <h1 className="fd-page-title">ATHLETE FEED</h1>
            <p className="fd-page-sub">
              Share your highlights — one post per day.
            </p>
          </div>

          {/* ── Upload card ──────────────────────────────────────────── */}
          <section className="fd-upload-section">
            {postedToday ? (
              <div className="fd-posted-today">
                <EmojiEvents className="fd-posted-today__icon" />
                <div>
                  <strong>You've posted today!</strong>
                  <p>Come back tomorrow to share your next highlight.</p>
                </div>
              </div>
            ) : (
              <div className="fd-upload-card">
                <div className="fd-upload-card__header">
                  <span className="fd-section-label">New Post</span>
                  <span className="fd-upload-card__limit">1 post per day</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {!uploadFile ? (
                  <button className="fd-upload-trigger" onClick={() => fileInputRef.current?.click()}>
                    <CloudUpload className="fd-upload-trigger__icon" />
                    <span className="fd-upload-trigger__label">Upload video or photo</span>
                    <span className="fd-upload-trigger__sub">MP4, MOV, JPG, PNG · Max {MAX_FILE_MB}MB</span>
                  </button>
                ) : (
                  <div className="fd-upload-preview">
                    {fileIsVideo ? (
                      <video
                        src={previewUrl}
                        className="fd-preview-media"
                        playsInline
                        preload="metadata"
                        controls
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        className="fd-preview-media"
                        alt="preview"
                      />
                    )}
                    <div className="fd-preview-type">
                      {fileIsVideo ? <Videocam style={{ fontSize: '0.85rem' }} /> : <ImageIcon style={{ fontSize: '0.85rem' }} />}
                      {fileIsVideo ? 'Video' : 'Photo'} · {(uploadFile.size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </div>
                )}

                {uploadFile && !uploading && (
                  <>
                    <textarea
                      className="fd-caption-input"
                      placeholder="Add a caption... (optional)"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      maxLength={200}
                      rows={2}
                    />
                    <div className="fd-upload-actions">
                      <button className="fd-btn-post" onClick={handlePost}>
                        <CloudUpload style={{ fontSize: '1rem' }} />
                        Post to Feed
                      </button>
                      <button className="fd-btn-cancel" onClick={() => { setUploadFile(null); setPreviewUrl(null); setCaption(''); setUploadError(''); }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {uploading && (
                  <div className="fd-progress-wrap">
                    <div className="fd-progress-bar">
                      <div className="fd-progress-bar__fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="fd-progress-text">{uploadProgress}%</span>
                  </div>
                )}

                {uploadError && <div className="fd-upload-error">{uploadError}</div>}
              </div>
            )}
          </section>

          {/* ── Feed grid ─────────────────────────────────────────────── */}
          <section className="fd-feed-section">
            <div className="fd-feed-header">
              <span className="fd-section-label">Latest</span>
              <h2 className="fd-feed-title">
                {posts.length} POST{posts.length !== 1 ? 'S' : ''}
              </h2>
            </div>

            {feedLoading ? (
              <div className="fd-feed-loading"><div className="fd-loading-spinner" /></div>
            ) : posts.length === 0 ? (
              <div className="fd-feed-empty">
                <DynamicFeed className="fd-feed-empty__icon" />
                <p>No posts yet. Be the first to share a highlight!</p>
              </div>
            ) : (
              <div className="fd-feed-grid">
                {posts.map((post) => {
                  const isOwn   = post.userId === authUser?.uid;
                  const isLiked = post.likedBy?.includes(authUser?.uid);
                  const likes   = post.likedBy?.length || 0;
                  const dateStr = post.createdAt?.toDate
                    ? post.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : '';

                  return (
                    <div key={post.id} className={`fd-card ${isOwn ? 'fd-card--own' : ''}`}>
                      {isOwn && <div className="fd-card__own-badge">Your Post</div>}

                      <div className="fd-card__media-wrap">
                        {post.mediaType === 'video' ? (
                          <video
                            src={post.mediaUrl}
                            className="fd-card__media"
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={post.mediaUrl}
                            className="fd-card__media"
                            alt={post.caption || 'Athlete post'}
                          />
                        )}
                        <div className="fd-card__media-type">
                          {post.mediaType === 'video'
                            ? <Videocam style={{ fontSize: '0.75rem' }} />
                            : <ImageIcon style={{ fontSize: '0.75rem' }} />}
                        </div>
                      </div>

                      {post.caption && (
                        <p className="fd-card__caption">{post.caption}</p>
                      )}

                      <div className="fd-card__footer">
                        <div className="fd-card__user">
                          <div className="fd-card__avatar">
                            {(post.userName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="fd-card__user-info">
                            <span className="fd-card__username">{post.userName || 'Athlete'}</span>
                            {dateStr && <span className="fd-card__date">{dateStr}</span>}
                          </div>
                        </div>
                        <button
                          className={`fd-like-btn ${isLiked ? 'fd-like-btn--liked' : ''} ${isOwn ? 'fd-like-btn--disabled' : ''}`}
                          onClick={() => !isOwn && handleLike(post)}
                          disabled={isOwn || likingId === post.id}
                          title={isOwn ? "Can't like your own post" : isLiked ? 'Unlike' : 'Like'}
                        >
                          {isLiked ? <Favorite className="fd-like-btn__icon" /> : <FavoriteBorder className="fd-like-btn__icon" />}
                          <span>{likes}</span>
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

export default FeedScreen;