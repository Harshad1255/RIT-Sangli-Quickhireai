import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import '../styles/LeaderboardPage.css';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('Global');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await scholasticApi.getLeaderboard({ tab: activeTab, limit: 50 });
      if (res.data && res.data.leaderboard) {
        setLeaderboard(res.data.leaderboard);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['Global', 'College', 'Monthly', 'Weekly', 'Contest'];

  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
            Scholastic Leaderboard
          </h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            Rankings based on XP, daily consistency, and competitive algorithmic contests.
          </p>
        </div>

        <div className="leaderboard-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`lb-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p style={{ marginTop: '1rem' }}>Loading leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <i className="fas fa-medal fa-2x" style={{ color: '#cbd5e1' }}></i>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>No leaderboard records found.</p>
        </div>
      ) : (
        <div>
          {/* Podium Top 3 */}
          {topThree.length > 0 && (
            <div className="podium-section">
              {/* Silver Rank #2 */}
              {topThree[1] && (
                <div className="podium-card rank-2">
                  <div className="podium-avatar silver">
                    {(topThree[1].userName || 'S')[0].toUpperCase()}
                  </div>
                  <h4>{topThree[1].userName}</h4>
                  <p>{topThree[1].university || 'General University'}</p>
                  <span className="xp-badge-pill">
                    <i className="fas fa-star" style={{ marginRight: '6px', color: '#f59e0b' }}></i>
                    {topThree[1].totalXP || 0} XP
                  </span>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                    Rank #2 • {topThree[1].streakDays || 1} Day Streak
                  </div>
                </div>
              )}

              {/* Gold Rank #1 */}
              {topThree[0] && (
                <div className="podium-card rank-1">
                  <div className="podium-crown">
                    <i className="fas fa-crown"></i>
                  </div>
                  <div className="podium-avatar gold">
                    {(topThree[0].userName || 'A')[0].toUpperCase()}
                  </div>
                  <h4>{topThree[0].userName}</h4>
                  <p>{topThree[0].university || 'General University'}</p>
                  <span className="xp-badge-pill" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <i className="fas fa-star" style={{ marginRight: '6px', color: '#f59e0b' }}></i>
                    {topThree[0].totalXP || 0} XP
                  </span>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: '700', color: '#b45309' }}>
                    Champion Rank #1 • {topThree[0].streakDays || 1} Day Streak
                  </div>
                </div>
              )}

              {/* Bronze Rank #3 */}
              {topThree[2] && (
                <div className="podium-card rank-3">
                  <div className="podium-avatar bronze">
                    {(topThree[2].userName || 'B')[0].toUpperCase()}
                  </div>
                  <h4>{topThree[2].userName}</h4>
                  <p>{topThree[2].university || 'General University'}</p>
                  <span className="xp-badge-pill">
                    <i className="fas fa-star" style={{ marginRight: '6px', color: '#f59e0b' }}></i>
                    {topThree[2].totalXP || 0} XP
                  </span>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                    Rank #3 • {topThree[2].streakDays || 1} Day Streak
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Table Ranks 4+ (or all if <3) */}
          <div className="leaderboard-table-card">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student Name</th>
                  <th>University / College</th>
                  <th>Solved</th>
                  <th>Daily Streak</th>
                  <th>Total XP</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, idx) => (
                  <tr key={row._id || idx}>
                    <td>
                      <div className="rank-circle">#{row.rank || (idx + 1)}</div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-initials">
                          {(row.userName || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{row.userName || 'Student'}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{row.university || 'General University'}</td>
                    <td>
                      <span style={{ fontWeight: '600', color: '#334155' }}>
                        {row.totalSolvedCount || 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#d97706', fontWeight: '600' }}>
                        <i className="fas fa-fire" style={{ marginRight: '4px' }}></i>
                        {row.streakDays || 0} Days
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: '#2563eb' }}>
                        {row.totalXP || 0} XP
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
