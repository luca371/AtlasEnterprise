// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  FitnessCenterOutlined,
  EmojiEventsOutlined,
  DynamicFeedOutlined,
  AutoAwesomeOutlined,
  SettingsOutlined,
  LogoutOutlined,
  SportsBasketball,
  Menu as MenuIcon,
  Close,
  ChevronLeft,
  ChevronRight,
  Psychology,
  WorkspacePremium,
} from '@mui/icons-material';
import './Sidebar.css';

const NAV_ITEMS = [
  { label: 'Home',             icon: <HomeOutlined />,          path: '/start',     soon: false },
  { label: "Today's Training", icon: <FitnessCenterOutlined />, path: '/today',     soon: true  },
  { label: 'Weekly Challenge', icon: <EmojiEventsOutlined />,   path: '/challenge', soon: false },
  { label: 'Basketball IQ',    icon: <Psychology />,            path: '/iq',        soon: false },
  { label: 'Feed',             icon: <DynamicFeedOutlined />,   path: '/feed',      soon: false },
  { label: 'Stars Feed',       icon: <AutoAwesomeOutlined />,   path: '/stars',     soon: true  },
];

const TIER_COLORS = {
  free:       '#718096',
  pro:        '#00D4AA',
  euroleague: '#FF5A1F',
  nba:        '#667eea',
};

const TIER_LABELS = {
  free:       'Free',
  pro:        'Pro',
  euroleague: 'EuroLeague',
  nba:        'NBA',
};

const Sidebar = ({ userData, onSignOut }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen]           = useState(false);   // mobile drawer
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sb_collapsed') === 'true';
  });

  const tier       = userData?.tier || 'free';
  const firstName  = userData?.firstName || '';
  const lastName   = userData?.lastName  || '';
  const tierColor  = TIER_COLORS[tier]  || TIER_COLORS.free;
  const tierLabel  = TIER_LABELS[tier]  || 'Free';

  // Sync body class so .sb-content-wrap responds in CSS
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sb-collapsed');
    } else {
      document.body.classList.remove('sb-collapsed');
    }
    localStorage.setItem('sb_collapsed', collapsed);
  }, [collapsed]);

  // Clean up body class on unmount
  useEffect(() => {
    return () => document.body.classList.remove('sb-collapsed');
  }, []);

  const handleNav = (path) => {
    navigate(path);
    setOpen(false);
  };

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="sb-mobile-bar">
        <button className="sb-hamburger" onClick={() => setOpen(true)}>
          <MenuIcon />
        </button>
        <span className="sb-mobile-logo">ATLAS</span>
        <div className="sb-mobile-avatar" style={{ background: tierColor }}>
          {firstName ? firstName.charAt(0).toUpperCase() : '?'}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {open && (
        <div className="sb-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar panel */}
      <aside className={`sb-panel ${open ? 'sb-panel--open' : ''} ${collapsed ? 'sb-panel--collapsed' : ''}`}>

        {/* Logo row */}
        <div className="sb-logo-row">
          {!collapsed && <span className="sb-logo">ATLAS</span>}
          <button className="sb-close" onClick={() => setOpen(false)}>
            <Close />
          </button>
          {/* Collapse toggle — desktop only */}
          <button className="sb-collapse-btn" onClick={toggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>

        {/* XP strip */}
        {!collapsed && (
          <button className="sb-xp-strip" onClick={() => handleNav('/experience')}>
            <WorkspacePremium className="sb-xp-strip__icon" />
            <span className="sb-xp-strip__text">
              <strong>{userData?.xp || 0} XP</strong>
              <span className="sb-xp-strip__link">Learn more</span>
            </span>
          </button>
        )}
        {collapsed && (
          <button className="sb-xp-icon-btn" onClick={() => handleNav('/experience')} title={`${userData?.xp || 0} XP — View rewards`}>
            <WorkspacePremium />
          </button>
        )}

        {/* Navigation */}
        <nav className="sb-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`sb-item ${isActive ? 'sb-item--active' : ''} ${item.soon ? 'sb-item--soon' : ''}`}
                onClick={() => !item.soon && handleNav(item.path)}
                title={item.soon ? `${item.label} — Coming soon` : item.label}
              >
                <span className="sb-item__icon">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="sb-item__label">{item.label}</span>
                    {item.soon && <span className="sb-soon-badge">Soon</span>}
                  </>
                )}
              </button>
            );
          })}

          <div className="sb-divider" />

          <button
            className={`sb-item ${location.pathname === '/settings' ? 'sb-item--active' : ''}`}
            onClick={() => handleNav('/settings')}
            title="Settings"
          >
            <span className="sb-item__icon"><SettingsOutlined /></span>
            {!collapsed && <span className="sb-item__label">Settings</span>}
          </button>
        </nav>

        {/* Footer — user info + tier + signout */}
        <div className="sb-footer">
          <div className="sb-user" title={`${firstName} ${lastName} · ${tierLabel}`}>
            <div className="sb-user__avatar" style={{ background: tierColor }}>
              {firstName ? firstName.charAt(0).toUpperCase() : '?'}
            </div>
            {!collapsed && (
              <div className="sb-user__info">
                <span className="sb-user__name">
                  {firstName} {lastName}
                </span>
                <span className="sb-user__tier" style={{ color: tierColor }}>
                  <SportsBasketball style={{ fontSize: '0.65rem', marginRight: 3 }} />
                  {tierLabel}
                </span>
              </div>
            )}
          </div>

          <button className="sb-signout" onClick={onSignOut} title="Sign out">
            <LogoutOutlined />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;