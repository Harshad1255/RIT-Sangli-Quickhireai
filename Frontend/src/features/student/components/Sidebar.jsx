import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = ({ setActiveSection, activeSection, navigate }) => {
  const location = useLocation();
  const [scholasticOpen, setScholasticOpen] = useState(true);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/rit-logo.png" alt="RIT Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>QuickHire AI</h2>
        </div>
      </div>

      <nav className="nav-menu">
        <div className="menu-section">
          <h3 className="section-title">MAIN MENU</h3>
          <ul>
            <li className={activeSection === 'home' ? 'active' : ''}>
              <button 
                onClick={() => setActiveSection('home')} 
                className="menu-item"
              >
                <i className="fas fa-home"></i>
                <span>Dashboard</span>
              </button>
            </li>
            <li className={activeSection === 'interviews' ? 'active' : ''}>
              <button 
                onClick={() => setActiveSection('interviews')} 
                className="menu-item"
              >
                <i className="fas fa-video"></i>
                <span>Interviews</span>
              </button>
            </li>
            <li className={activeSection === 'assigned-aptitude' ? 'active' : ''}>
              <button 
                onClick={() => setActiveSection('assigned-aptitude')} 
                className="menu-item"
              >
                <i className="fas fa-file-signature"></i>
                <span>Aptitude Tests</span>
              </button>
            </li>
            <li className={activeSection === 'coding-platform' ? 'active' : ''}>
              <button 
                onClick={() => setActiveSection('coding-platform')} 
                className="menu-item"
              >
                <i className="fas fa-laptop-code"></i>
                <span>Coding Platform</span>
              </button>
            </li>
            <li className={activeSection === 'profile' ? 'active' : ''}>
              <button 
                onClick={() => setActiveSection('profile')} 
                className="menu-item"
              >
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="menu-section">
          <div 
            className="section-title-toggle" 
            onClick={() => setScholasticOpen(!scholasticOpen)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.4rem 0.5rem',
              borderRadius: '6px',
              color: '#4f46e5',
              fontWeight: 700,
              fontSize: '0.78rem'
            }}
          >
            <span><i className="fas fa-layer-group" style={{ marginRight: '6px' }}></i>SCHOLASTIC PRACTICE</span>
            <i className={`fas fa-chevron-${scholasticOpen ? 'down' : 'right'}`} style={{ fontSize: '0.7rem' }}></i>
          </div>
          {scholasticOpen && (
            <ul>
              <li className={activeSection === 'scholastic-dashboard' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-dashboard')} 
                  className="menu-item"
                >
                  <i className="fas fa-chart-pie" style={{ color: '#6366f1' }}></i>
                  <span>Dashboard</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-aptitude' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-aptitude')} 
                  className="menu-item"
                >
                  <i className="fas fa-brain" style={{ color: '#06b6d4' }}></i>
                  <span>Aptitude</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-coding' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-coding')} 
                  className="menu-item"
                >
                  <i className="fas fa-code" style={{ color: '#3b82f6' }}></i>
                  <span>Coding</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-contests' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-contests')} 
                  className="menu-item"
                >
                  <i className="fas fa-trophy" style={{ color: '#f59e0b' }}></i>
                  <span>Contests</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-leaderboard' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-leaderboard')} 
                  className="menu-item"
                >
                  <i className="fas fa-medal" style={{ color: '#eab308' }}></i>
                  <span>Leaderboard</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-progress' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-progress')} 
                  className="menu-item"
                >
                  <i className="fas fa-chart-line" style={{ color: '#10b981' }}></i>
                  <span>Progress</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-bookmarks' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-bookmarks')} 
                  className="menu-item"
                >
                  <i className="fas fa-bookmark" style={{ color: '#ec4899' }}></i>
                  <span>Bookmarks</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-mocktests' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-mocktests')} 
                  className="menu-item"
                >
                  <i className="fas fa-clipboard-check" style={{ color: '#8b5cf6' }}></i>
                  <span>Mock Tests</span>
                </button>
              </li>
              <li className={activeSection === 'scholastic-profile' ? 'active' : ''}>
                <button 
                  onClick={() => setActiveSection('scholastic-profile')} 
                  className="menu-item"
                >
                  <i className="fas fa-user-graduate" style={{ color: '#14b8a6' }}></i>
                  <span>Profile</span>
                </button>
              </li>
            </ul>
          )}
        </div>

        <div className="menu-section">
          <h3 className="section-title">RESOURCES</h3>
          <ul>
            <li>
              <button className="menu-item">
                <i className="fas fa-book"></i>
                <span>Learning Resources</span>
              </button>
            </li>
            <li>
              <button className="menu-item">
                <i className="fas fa-question-circle"></i>
                <span>Support</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        <i className="fas fa-sign-out-alt"></i>
        <span>Logout</span>
      </button>
    </div>
  );
};

export default Sidebar; 