// src/screens/WorkoutDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { awardXP } from '../utils/xpUtils';
import { ArrowBack, CheckCircle, PlayArrow, Pause, EmojiEvents, FitnessCenter } from '@mui/icons-material';
import './WorkoutDetailScreen.css';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const TIER_COLORS = { pro: '#00D4AA', euroleague: '#FF5A1F', nba: '#667eea' };

const WorkoutDetailScreen = () => {
  const { workoutId } = useParams();
  const location      = useLocation();
  const navigate      = useNavigate();
  const workout       = location.state?.workout || null;

  const [authUser, setAuthUser]       = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAllDone, setIsAllDone]     = useState(false);
  const [marking, setMarking]         = useState(false);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [xpAwarded, setXpAwarded]     = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      setAuthUser(user);
      if (!workoutId) return;
      try {
        const snap = await getDoc(doc(db, 'dailyPlans', `${user.uid}_${getTodayKey()}`));
        if (!snap.exists()) return;
        const data = snap.data();
        const completed = data.completedWorkoutIds || [];
        const allIds = (data.subcategories || []).flatMap(s => s.workouts.map(w => w.id));
        setIsCompleted(completed.includes(workoutId));
        setIsAllDone(allIds.length > 0 && allIds.every(id => completed.includes(id)));
        setXpAwarded(data.xpAwarded || false);
      } catch (e) { console.error(e); }
    });
    return () => unsub();
  }, [workoutId, navigate]);

  const handleDone = async () => {
    if (!authUser || isCompleted || marking) return;
    setMarking(true);
    const planId = `${authUser.uid}_${getTodayKey()}`;
    try {
      await updateDoc(doc(db, 'dailyPlans', planId), { completedWorkoutIds: arrayUnion(workoutId) });
      setIsCompleted(true);
      const snap = await getDoc(doc(db, 'dailyPlans', planId));
      if (!snap.exists()) return;
      const data = snap.data();
      const completed = data.completedWorkoutIds || [];
      const allIds = (data.subcategories || []).flatMap(s => s.workouts.map(w => w.id));
      const allDone = allIds.length > 0 && allIds.every(id => completed.includes(id));
      if (allDone) {
        setIsAllDone(true);
        if (!data.xpAwarded) {
          await awardXP(authUser.uid, 3);
          await updateDoc(doc(db, 'dailyPlans', planId), { xpAwarded: true });
          setXpAwarded(true);
        }
      }
    } catch (e) { console.error(e); }
    finally { setMarking(false); }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    isPlaying ? videoRef.current.pause() : videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  if (!workout) {
    return (
      <div className="wd-error">
        <p>Workout not found.</p>
        <button onClick={() => navigate('/start')}>← Back to dashboard</button>
      </div>
    );
  }

  const tierColor = TIER_COLORS[workout.tier] || '#00D4AA';

  return (
    <div className="wd-root">
      <button className="wd-back" onClick={() => navigate(-1)}>
        <ArrowBack className="wd-back__icon" /> Back
      </button>

      <div className="wd-content">

        {/* 1 ── Title */}
        <div className="wd-header">
          <h1 className="wd-title">{workout.title}</h1>
          <div className="wd-meta">
            <FitnessCenter className="wd-meta__icon" style={{ color: tierColor }} />
            <span className="wd-meta__sub">{workout.subcategory?.replace(/_/g, ' ')}</span>
            <span className="wd-meta__dot">·</span>
            <span className="wd-meta__dur">{workout.duration} min to do this exercise</span>
          </div>
        </div>

        {/* 2 ── Video */}
        <div className="wd-video-wrap">
          <video
            ref={videoRef}
            className="wd-video"
            src={workout.videoUrl}
            playsInline
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <button className="wd-video-overlay" onClick={togglePlay}>
            {isPlaying ? <Pause className="wd-overlay-icon" /> : <PlayArrow className="wd-overlay-icon" />}
          </button>
          <div className="wd-video-tier" style={{ background: `${tierColor}22`, color: tierColor, borderColor: `${tierColor}55` }}>
            {workout.tier?.toUpperCase()}
          </div>
        </div>

        {/* 3 ── Description */}
        {workout.description && (
          <p className="wd-description">{workout.description}</p>
        )}

        {/* 4 ── Mark as Done */}
        <button
          className={`wd-done-btn ${isCompleted ? 'wd-done-btn--completed' : ''}`}
          onClick={handleDone}
          disabled={isCompleted || marking}
        >
          {marking ? <span className="wd-done-btn__spinner" /> :
           isCompleted ? <><CheckCircle className="wd-done-btn__icon" /> Completed</> :
           'Mark as Done'}
        </button>

        {/* All day complete banner */}
        {isAllDone && (
          <div className="wd-all-done">
            <EmojiEvents className="wd-all-done__icon" />
            <div>
              <p className="wd-all-done__title">Day Complete!</p>
              <p className="wd-all-done__sub">{xpAwarded ? '+3 XP earned for today.' : 'All workouts finished.'}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkoutDetailScreen;