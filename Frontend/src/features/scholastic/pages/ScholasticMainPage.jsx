import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ScholasticDashboard from '../components/ScholasticDashboard';
import AptitudePractice from '../components/AptitudePractice';
import CodingPractice from '../components/CodingPractice';
import ContestsPage from '../components/ContestsPage';
import LeaderboardPage from '../components/LeaderboardPage';
import ProgressPage from '../components/ProgressPage';
import BookmarksPage from '../components/BookmarksPage';
import MockTestsPage from '../components/MockTestsPage';
import ProfilePage from '../components/ProfilePage';
import PracticeSetRunner from '../components/PracticeSetRunner';
import PracticeSetResult from '../components/PracticeSetResult';

const ScholasticMainPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;

  const getActiveTab = () => {
    if (path.includes('/practice-sets/result')) return 'practice-set-result';
    if (path.includes('/practice-sets/')) return 'practice-set-runner'; // Includes ID
    if (path.includes('/aptitude')) return 'aptitude';
    if (path.includes('/coding')) return 'coding';
    if (path.includes('/contests')) return 'contests';
    if (path.includes('/leaderboard')) return 'leaderboard';
    if (path.includes('/progress')) return 'progress';
    if (path.includes('/bookmarks')) return 'bookmarks';
    if (path.includes('/mock-tests')) return 'mock-tests';
    if (path.includes('/profile')) return 'profile';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleNav = (tab) => {
    if (tab === 'dashboard') {
      navigate('/dashboard/scholastic');
    } else {
      navigate(`/dashboard/scholastic/${tab}`);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-home' },
    { id: 'aptitude', label: 'Aptitude Bank', icon: 'fa-brain' },
    { id: 'coding', label: 'Coding Arena', icon: 'fa-code' },
    { id: 'contests', label: 'Contests', icon: 'fa-trophy' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-medal' },
    { id: 'progress', label: 'Analytics', icon: 'fa-chart-line' },
    { id: 'mock-tests', label: 'Mock Tests', icon: 'fa-clipboard-check' },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'fa-bookmark' },
    { id: 'profile', label: 'Profile', icon: 'fa-user-graduate' },
  ];

  const handleSectionSwitch = (sectionKey) => {
    if (sectionKey === 'scholastic-aptitude') navigate('/dashboard/scholastic/aptitude');
    else if (sectionKey === 'scholastic-coding') navigate('/dashboard/scholastic/coding');
    else if (sectionKey === 'scholastic-contests') navigate('/dashboard/scholastic/contests');
    else if (sectionKey === 'scholastic-leaderboard') navigate('/dashboard/scholastic/leaderboard');
    else if (sectionKey === 'scholastic-progress') navigate('/dashboard/scholastic/progress');
    else if (sectionKey === 'scholastic-mocktests') navigate('/dashboard/scholastic/mock-tests');
    else if (sectionKey === 'scholastic-bookmarks') navigate('/dashboard/scholastic/bookmarks');
    else if (sectionKey === 'scholastic-profile') navigate('/dashboard/scholastic/profile');
    else navigate('/dashboard/scholastic');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '3rem' }}>
      {/* Top Scholastic Sub-nav */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-graduation-cap"></i>
          </div>
          <span>Scholastic Practice</span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === item.id ? '#eff6ff' : 'transparent',
                color: activeTab === item.id ? '#2563eb' : '#64748b',
                fontWeight: activeTab === item.id ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Render Active View */}
      <div>
        {activeTab === 'dashboard' && <ScholasticDashboard setActiveSection={handleSectionSwitch} />}
        {activeTab === 'aptitude' && <AptitudePractice />}
        {activeTab === 'practice-set-runner' && <PracticeSetRunner />}
        {activeTab === 'practice-set-result' && <PracticeSetResult />}
        {activeTab === 'coding' && <CodingPractice />}
        {activeTab === 'contests' && <ContestsPage />}
        {activeTab === 'leaderboard' && <LeaderboardPage />}
        {activeTab === 'progress' && <ProgressPage />}
        {activeTab === 'mock-tests' && <MockTestsPage setActiveSection={handleSectionSwitch} />}
        {activeTab === 'bookmarks' && <BookmarksPage setActiveSection={handleSectionSwitch} />}
        {activeTab === 'profile' && <ProfilePage />}
      </div>
    </div>
  );
};

export default ScholasticMainPage;
