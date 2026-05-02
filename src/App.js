// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingScreen  from './screens/LandingScreen';
import LoginScreen    from './screens/LoginScreen';
import SignupScreen   from './screens/SignupScreen';
import StartScreen    from './screens/StartScreen';
import SettingsScreen from './screens/SettingsScreen';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"         element={<LandingScreen />} />
        <Route path="/login"    element={<LoginScreen />} />
        <Route path="/signup"   element={<SignupScreen />} />
        <Route path="/start"    element={<StartScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*"         element={<LandingScreen />} />
      </Routes>
    </Router>
  );
}

export default App;