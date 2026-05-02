// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import {
  ArrowForward,
  Visibility,
  VisibilityOff,
  SportsBasketball,
  Error as ErrorIcon,
} from '@mui/icons-material';
import './LoginScreen.css';

const LoginScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/start');
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later.');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Background */}
      <div className="login-bg">
        <div className="login-glow login-glow--1" />
        <div className="login-glow login-glow--2" />
        <div className="login-grid" />
      </div>

      {/* Nav logo */}
      <button className="login-logo" onClick={() => navigate('/')}>
        ATLAS
      </button>

      <div className="login-container">
        {/* Left panel — branding */}
        <div className="login-panel login-panel--left">
          <div className="login-panel__content">
            <div className="login-panel__badge">
              <SportsBasketball className="panel-badge-icon" />
              <span>Pro Training Platform</span>
            </div>
            <h1 className="login-panel__title">
              BACK ON<br />
              <span className="login-accent">THE COURT</span>
            </h1>
            <p className="login-panel__sub">
              Sign in to continue your training with real Euroleague athletes.
            </p>

            <div className="login-panel__stats">
              <div className="login-stat">
                <span className="login-stat__num">12K+</span>
                <span className="login-stat__label">Active Players</span>
              </div>
              <div className="login-stat__divider" />
              <div className="login-stat">
                <span className="login-stat__num">340+</span>
                <span className="login-stat__label">Pro Workouts</span>
              </div>
              <div className="login-stat__divider" />
              <div className="login-stat">
                <span className="login-stat__num">8</span>
                <span className="login-stat__label">Ambassadors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-panel login-panel--right">
          <div className="login-form-wrap">
            <div className="login-form-header">
              <h2 className="login-form-title">Welcome back</h2>
              <p className="login-form-sub">Sign in to your Atlas account</p>
            </div>

            <form className="login-form" onSubmit={handleLogin} noValidate>
              {/* Error */}
              {error && (
                <div className="login-error">
                  <ErrorIcon className="error-icon" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className="login-field">
                <label className="login-label">Email</label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="login-field">
                <div className="login-label-row">
                  <label className="login-label">Password</label>
                  <button
                    type="button"
                    className="login-forgot"
                    onClick={() => {/* TODO: forgot password */}}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="login-input-wrap">
                  <input
                    className="login-input login-input--pw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`login-submit ${loading ? 'login-submit--loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="login-spinner" />
                ) : (
                  <>
                    Sign In <ArrowForward className="btn-icon" />
                  </>
                )}
              </button>
            </form>

            <p className="login-switch">
              Don't have an account?{' '}
              <button onClick={() => navigate('/signup')}>
                Create one free <ArrowForward style={{ fontSize: '0.85rem', verticalAlign: 'middle' }} />
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;