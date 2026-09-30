import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import '../styles/ScholasticDashboard.css';

const ScholasticDashboard = ({ setActiveSection }) => {
  const [stats, setStats] = useState({ xp: 0, coins: 0, level: 1 });
  const [progress, setProgress] = useState({
    dailyStreak: 0,
    questionsSolved: {
      aptitude: { total: 0 },
      coding: { total: 0 }
    }
  });
  const [companies, setCompanies] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [progressRes, companiesRes, dailyRes] = await Promise.all([
        scholasticApi.getProgress().catch(() => ({ data: null })),
        scholasticApi.getCompanies().catch(() => ({ data: { companies: [] } })),
        scholasticApi.getDailyChallenge().catch(() => ({ data: { challenge: null } }))
      ]);

      if (progressRes?.data?.success) {
        setStats(progressRes.data.stats || { xp: 0, coins: 0, level: 1 });
        setProgress(progressRes.data.progress || {
          dailyStreak: 0,
          questionsSolved: { aptitude: { total: 0 }, coding: { total: 0 } }
        });
      }

      if (Array.isArray(companiesRes?.data?.companies)) {
        setCompanies(companiesRes.data.companies);
      }

      if (dailyRes?.data?.challenge) {
        setDailyChallenge(dailyRes.data.challenge);
      } else {
        setDailyChallenge(null);
      }
    } catch (err) {
      console.error('Error fetching scholastic dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSolved = (progress.questionsSolved?.aptitude?.total || 0) + (progress.questionsSolved?.coding?.total || 0);

  return (
    <div className="scholastic-dashboard">
      <div className="scholastic-hero-banner">
        <div className="hero-content">
          <h1>Scholastic Aptitude & Coding Hub</h1>
          <p>Master placement aptitude tests, solve FAANG-grade algorithms, and climb the university leaderboard.</p>
          <div className="hero-stats-row">
            <div className="hero-stat-box">
              <i className="fas fa-fire"></i>
              <div className="hero-stat-info">
                <span className="hero-stat-value">{progress.dailyStreak || 0} Days</span>
                <span className="hero-stat-label">Current Streak</span>
              </div>
            </div>
            <div className="hero-stat-box">
              <i className="fas fa-star"></i>
              <div className="hero-stat-info">
                <span className="hero-stat-value">{stats.xp || 0} XP</span>
                <span className="hero-stat-label">Level {stats.level || 1}</span>
              </div>
            </div>
            <div className="hero-stat-box">
              <i className="fas fa-check-circle"></i>
              <div className="hero-stat-info">
                <span className="hero-stat-value">{totalSolved}</span>
                <span className="hero-stat-label">Solved Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="progress-box" style={{ textAlign: 'center', padding: '1.5rem' }}>Loading dashboard...</div>
      ) : null}

      {dailyChallenge && (
        <div className="daily-challenge-card">
          <div className="daily-challenge-info">
            <h3>
              {dailyChallenge.title}
              <span className="badge-pill daily">Daily Challenge</span>
              <span className="badge-pill xp">+{dailyChallenge.xpReward || 0} XP</span>
            </h3>
            <p className="daily-challenge-desc">
              Solve today's {dailyChallenge.difficulty || 'Medium'} difficulty problem to extend your streak and earn bonus XP!
            </p>
          </div>
          <button
            className="solve-btn"
            onClick={() => setActiveSection(dailyChallenge.questionType === 'aptitude' ? 'scholastic-aptitude' : 'scholastic-coding')}
          >
            <span>Solve Now</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      )}

      <h3 className="section-grid-title">
        <i className="fas fa-compass" style={{ color: '#3b82f6' }}></i>
        Practice Modules
      </h3>
      <div className="modules-grid">
        <div className="module-card" onClick={() => setActiveSection('scholastic-aptitude')}>
          <div>
            <div className="module-icon aptitude">
              <i className="fas fa-brain"></i>
            </div>
            <h4>Quantitative & Verbal Aptitude</h4>
            <p>100+ placement aptitude questions across Arithmetic, Logical Reasoning, and Verbal Ability.</p>
          </div>
          <div className="module-card-footer">
            <span>Explore Aptitude</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>

        <div className="module-card" onClick={() => setActiveSection('scholastic-coding')}>
          <div>
            <div className="module-icon coding">
              <i className="fas fa-code"></i>
            </div>
            <h4>Algorithmic Coding Arena</h4>
            <p>Data Structures & Algorithms practice with integrated IDE, test cases, and instant execution.</p>
          </div>
          <div className="module-card-footer">
            <span>Explore Coding</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>

        <div className="module-card" onClick={() => setActiveSection('scholastic-contests')}>
          <div>
            <div className="module-icon contests">
              <i className="fas fa-trophy"></i>
            </div>
            <h4>University & Placement Contests</h4>
            <p>Compete in timed coding sprints and university-wide hackathons to boost your global rating.</p>
          </div>
          <div className="module-card-footer">
            <span>View Contests</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>

        <div className="module-card" onClick={() => setActiveSection('scholastic-mocktests')}>
          <div>
            <div className="module-icon mocktests">
              <i className="fas fa-clipboard-check"></i>
            </div>
            <h4>Company Mock Placement Tests</h4>
            <p>Full-length simulated placement tests for TCS, Infosys, Wipro, Google, and Amazon.</p>
          </div>
          <div className="module-card-footer">
            <span>Take Mock Test</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>

      <div className="company-section">
        <h3 className="section-grid-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          <i className="fas fa-building" style={{ color: '#64748b' }}></i>
          Practice by Company
        </h3>
        <div className="companies-flex">
          {companies.length > 0 ? (
            companies.map((comp, idx) => (
              <div
                key={comp._id || idx}
                className="company-chip"
                onClick={() => setActiveSection('scholastic-coding')}
              >
                <i className="fas fa-briefcase" style={{ color: '#3b82f6' }}></i>
                <span>{comp.name}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({comp.questionCount || 0})</span>
              </div>
            ))
          ) : (
            <div className="company-chip" style={{ opacity: 0.7, cursor: 'default' }}>
              <i className="fas fa-briefcase" style={{ color: '#3b82f6' }}></i>
              <span>No company practice sets available yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScholasticDashboard;
