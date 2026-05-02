// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingScreen      from './screens/LandingScreen';
import LoginScreen        from './screens/LoginScreen';
import SignupScreen       from './screens/SignupScreen';
import StartScreen        from './screens/StartScreen';
import SettingsScreen     from './screens/SettingsScreen';
import ChallengeScreen    from './screens/ChallengeScreen';
import FeedScreen         from './screens/FeedScreen';
import BasketballIQScreen from './screens/BasketballIQScreen';
import ExperienceScreen   from './screens/ExperienceScreen';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"           element={<LandingScreen />} />
        <Route path="/login"      element={<LoginScreen />} />
        <Route path="/signup"     element={<SignupScreen />} />
        <Route path="/start"      element={<StartScreen />} />
        <Route path="/settings"   element={<SettingsScreen />} />
        <Route path="/challenge"  element={<ChallengeScreen />} />
        <Route path="/feed"       element={<FeedScreen />} />
        <Route path="/iq"         element={<BasketballIQScreen />} />
        <Route path="/experience" element={<ExperienceScreen />} />
        <Route path="*"           element={<LandingScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
