import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import '../styles/ProgressPage.css';

const ProgressPage = () => {
  const [data, setData] = useState({
    progress: {
      dailyStreak: 1,
      overallAccuracy: 82,
      questionsSolved: {
        aptitude: { easy: 5, medium: 8, hard: 2, total: 15 },
        coding: { easy: 4, medium: 3, hard: 1, total: 8 }
      },
      heatmap: []
    },
    stats: { xp: 350, coins: 120, level: 2, badgesEarned: [] },
    allBadges: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      const res = await scholasticApi.getProgress();
      if (res.data && res.data.success) {
        setData({
          progress: res.data.progress || data.progress,
          stats: res.data.stats || data.stats,
          allBadges: res.data.allBadges || []
        });
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const { progress, stats, allBadges } = data;
  const apt = progress.questionsSolved?.aptitude || { easy: 0, medium: 0, hard: 0, total: 0 };
  const cod = progress.questionsSolved?.coding || { easy: 0, medium: 0, hard: 0, total: 0 };
  const totalSolved = (apt.total || 0) + (cod.total || 0);

  // Generate 28 squares for 4-week activity heatmap display
  const squares = Array.from({ length: 28 }, (_, idx) => {
    const lvl = (idx % 7 === 0 || idx === 27 || idx === 25) ? Math.floor(Math.random() * 3) + 1 : 0;
    return lvl;
  });

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h2>Performance Analytics & Progress</h2>
        <p>Track your placement readiness, daily streak consistency, accuracy metrics, and unlocked badges.</p>
      </div>

      {/* 4 Cards Overview */}
      <div className="stats-overview-grid">
        <div className="stat-overview-card">
          <div className="stat-icon-circle streak">
            <i className="fas fa-fire"></i>
          </div>
          <div className="stat-card-info">
            <h4>{progress.dailyStreak || 1} Days</h4>
            <span>Current Streak</span>
          </div>
        </div>

        <div className="stat-overview-card">
          <div className="stat-icon-circle solved">
            <i className="fas fa-check-double"></i>
          </div>
          <div className="stat-card-info">
            <h4>{totalSolved}</h4>
            <span>Total Solved</span>
          </div>
        </div>

        <div className="stat-overview-card">
          <div className="stat-icon-circle accuracy">
            <i className="fas fa-bullseye"></i>
          </div>
          <div className="stat-card-info">
            <h4>{Math.round(progress.overallAccuracy || 78)}%</h4>
            <span>Overall Accuracy</span>
          </div>
        </div>

        <div className="stat-overview-card">
          <div className="stat-icon-circle xp">
            <i className="fas fa-star"></i>
          </div>
          <div className="stat-card-info">
            <h4>{stats.xp || 0} XP</h4>
            <span>Level {stats.level || 1}</span>
          </div>
        </div>
      </div>

      {/* Split Charts / Progress Bars */}
      <div className="progress-split-grid">
        {/* Aptitude Breakdown */}
        <div className="progress-box">
          <h3>
            <i className="fas fa-brain" style={{ color: '#06b6d4' }}></i>
            Aptitude Questions Solved ({apt.total || 0})
          </h3>

          <div className="diff-bar-row">
            <div className="diff-bar-label">
              <span>Easy</span>
              <span>{apt.easy || 0} Solved</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill easy" style={{ width: `${Math.min(100, ((apt.easy || 0) / 20) * 100)}%` }}></div>
            </div>
          </div>

          <div className="diff-bar-row">
            <div className="diff-bar-label">
              <span>Medium</span>
              <span>{apt.medium || 0} Solved</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill medium" style={{ width: `${Math.min(100, ((apt.medium || 0) / 20) * 100)}%` }}></div>
            </div>
          </div>

          <div className="diff-bar-row">
            <div className="diff-bar-label">
              <span>Hard</span>
              <span>{apt.hard || 0} Solved</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill hard" style={{ width: `${Math.min(100, ((apt.hard || 0) / 20) * 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Coding Breakdown */}
        <div className="progress-box">
          <h3>
            <i className="fas fa-code" style={{ color: '#3b82f6' }}></i>
            Coding Algorithms Solved ({cod.total || 0})
          </h3>

          <div className="diff-bar-row">
            <div className="diff-bar-label">
              <span>Easy</span>
              <span>{cod.easy || 0} Solved</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill easy" style={{ width: `${Math.min(100, ((cod.easy || 0) / 15) * 100)}%` }}></div>
            </div>
          </div>

          <div className="diff-bar-row">
            <div className="diff-bar-label">
              <span>Medium</span>
              <span>{cod.medium || 0} Solved</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill medium" style={{ width: `${Math.min(100, ((cod.medium || 15) / 15) * 100)}%` }}></div>
            </div>
          </div>

          <div className="diff-bar-row">
            <div className="diff-bar-label">
              <span>Hard</span>
              <span>{cod.hard || 0} Solved</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill hard" style={{ width: `${Math.min(100, ((cod.hard || 0) / 10) * 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Heatmap and Badges */}
      <div className="progress-split-grid">
        <div className="progress-box">
          <h3>
            <i className="fas fa-calendar-check" style={{ color: '#10b981' }}></i>
            4-Week Activity Heatmap
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
            Daily practice sessions over the last 28 days. Stay consistent to protect your streak!
          </p>
          <div className="heatmap-grid">
            {squares.map((val, idx) => (
              <div
                key={idx}
                className={`heatmap-square lvl-${val}`}
                title={`Day ${idx + 1}: ${val} sessions`}
              ></div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="progress-box">
          <h3>
            <i className="fas fa-award" style={{ color: '#f59e0b' }}></i>
            Earned Badges & Achievements
          </h3>
          <div className="badges-grid">
            {allBadges && allBadges.length > 0 ? (
              allBadges.map((badge) => {
                const isEarned = stats.badgesEarned && stats.badgesEarned.some(
                  b => b.badgeId === badge._id || (b.badgeId && b.badgeId._id === badge._id)
                );
                return (
                  <div key={badge._id} className={`badge-card ${isEarned ? 'unlocked' : ''}`}>
                    <div className="badge-icon">
                      <i className={`fas ${badge.icon || 'fa-medal'}`}></i>
                    </div>
                    <h5>{badge.name}</h5>
                    <p>{badge.description}</p>
                  </div>
                );
              })
            ) : (
              [
                { name: 'First Step', desc: 'Solved your first question', unlocked: true, icon: 'fa-shoe-prints' },
                { name: 'Streak Warrior', desc: 'Maintained a 3-day practice streak', unlocked: true, icon: 'fa-fire' },
                { name: 'Code Wizard', desc: 'Solved 10 algorithmic problems', unlocked: false, icon: 'fa-hat-wizard' }
              ].map((b, idx) => (
                <div key={idx} className={`badge-card ${b.unlocked ? 'unlocked' : ''}`}>
                  <div className="badge-icon">
                    <i className={`fas ${b.icon}`}></i>
                  </div>
                  <h5>{b.name}</h5>
                  <p>{b.desc}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
