import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import '../styles/ProgressPage.css';

const ProgressPage = () => {
  const [data, setData] = useState({
    progress: {
      dailyStreak: 0,
      overallAccuracy: 0,
      questionsSolved: {
        aptitude: { easy: 0, medium: 0, hard: 0, total: 0 },
        coding: { easy: 0, medium: 0, hard: 0, total: 0 }
      },
      heatmap: []
    },
    stats: { xp: 0, coins: 0, level: 1, badgesEarned: [] },
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

  const [heatmapRange, setHeatmapRange] = useState(28);

  const { progress, stats, allBadges } = data;
  const apt = progress.questionsSolved?.aptitude || { easy: 0, medium: 0, hard: 0, total: 0 };
  const cod = progress.questionsSolved?.coding || { easy: 0, medium: 0, hard: 0, total: 0 };
  const totalSolved = (apt.total || 0) + (cod.total || 0);

  const generateHeatmapGrid = (days) => {
    // Generate dates going backwards from today
    const grid = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sourceData = progress.heatmap || [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const existing = sourceData.find(h => h.date === dateStr);
      grid.push({
        date: dateStr,
        total: existing ? (existing.total || existing.count || 0) : 0,
        aptitude: existing ? (existing.aptitudeCount || 0) : 0,
        coding: existing ? (existing.codingCount || 0) : 0
      });
    }
    return grid;
  };

  const heatmapData = generateHeatmapGrid(heatmapRange);

  const getHeatmapColor = (total) => {
    if (total <= 0) return 'lvl-0';
    if (total === 1) return 'lvl-1';
    if (total === 2) return 'lvl-2';
    if (total === 3) return 'lvl-3';
    return 'lvl-4';
  };

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h2>Performance Analytics & Progress</h2>
        <p>Track your placement readiness, daily streak consistency, accuracy metrics, and unlocked badges.</p>
      </div>

      {loading ? (
        <div className="progress-box" style={{ textAlign: 'center', padding: '2rem' }}>Loading your progress...</div>
      ) : (
        <>
          <div className="stats-overview-grid">
            <div className="stat-overview-card">
              <div className="stat-icon-circle streak">
                <i className="fas fa-fire"></i>
              </div>
              <div className="stat-card-info">
                <h4>{progress.dailyStreak || 0} Days</h4>
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
                <h4>{Math.round(progress.overallAccuracy || 0)}%</h4>
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

          <div className="progress-split-grid">
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
                  <div className="bar-fill medium" style={{ width: `${Math.min(100, ((cod.medium || 0) / 15) * 100)}%` }}></div>
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

          <div className="progress-split-grid">
            <div className="progress-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>
                  <i className="fas fa-calendar-check" style={{ color: '#10b981' }}></i>
                  Activity Heatmap
                </h3>
                <select 
                  value={heatmapRange} 
                  onChange={(e) => setHeatmapRange(Number(e.target.value))}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value={28}>Last 4 Weeks</option>
                  <option value={90}>Last 3 Months</option>
                  <option value={365}>Last Year</option>
                </select>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Daily practice sessions. Stay consistent to protect your streak!
              </p>
              <div className="heatmap-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${Math.ceil(heatmapRange / 7)}, 1fr)`, 
                gap: '4px',
                gridAutoFlow: 'column',
                gridTemplateRows: 'repeat(7, 1fr)'
              }}>
                {heatmapData.map((day, idx) => (
                  <div
                    key={idx}
                    className={`heatmap-square ${getHeatmapColor(day.total)}`}
                    title={`${day.date}: ${day.total} Total (Aptitude: ${day.aptitude}, Coding: ${day.coding})`}
                  ></div>
                ))}
              </div>
            </div>

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
                  <div style={{ color: '#64748b', paddingTop: '1rem' }}>No badges have been unlocked yet.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProgressPage;
