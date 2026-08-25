import { useState, useEffect } from 'react';
import { api } from '../../../shared/services/api';
import CompanySidebar from './CompanySidebar';
import '../styles/CompanyLeaderboard.css';

const CompanyLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/aptitude/company/leaderboard');
      if (res.data && res.data.success) {
        setLeaderboard(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to fetch leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <CompanySidebar />
      <div className="company-leaderboard-container">
        <div className="leaderboard-header">
          <h2>Student Leadership Board & Reports</h2>
          <p>Rankings based on total performance across your Aptitude Tests</p>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div className="loading-state">Loading leadership board...</div>
        ) : leaderboard.length === 0 ? (
          <div className="empty-state">
            No students have completed your tests yet.
          </div>
        ) : (
          <div className="leaderboard-content">
            {/* Podium for Top 3 */}
            {topThree.length > 0 && (
              <div className="podium-container">
                {/* Silver */}
                {topThree[1] && (
                  <div className="podium-card silver">
                    <div className="avatar">{(topThree[1].name || 'S')[0]}</div>
                    <h4>{topThree[1].name}</h4>
                    <span className="xp-badge">{topThree[1].totalXP} XP</span>
                    <span className="rank-badge">Rank #2</span>
                  </div>
                )}
                {/* Gold */}
                {topThree[0] && (
                  <div className="podium-card gold">
                    <div className="crown"><i className="fas fa-crown"></i></div>
                    <div className="avatar">{(topThree[0].name || 'S')[0]}</div>
                    <h4>{topThree[0].name}</h4>
                    <span className="xp-badge">{topThree[0].totalXP} XP</span>
                    <span className="rank-badge">Rank #1</span>
                  </div>
                )}
                {/* Bronze */}
                {topThree[2] && (
                  <div className="podium-card bronze">
                    <div className="avatar">{(topThree[2].name || 'S')[0]}</div>
                    <h4>{topThree[2].name}</h4>
                    <span className="xp-badge">{topThree[2].totalXP} XP</span>
                    <span className="rank-badge">Rank #3</span>
                  </div>
                )}
              </div>
            )}

            {/* Table for all students */}
            <div className="leaderboard-table-card">
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Tests Taken</th>
                    <th>Accuracy</th>
                    <th>Total XP</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.studentId}>
                      <td><div className="rank-circle">#{row.rank}</div></td>
                      <td>
                        <div className="user-cell">
                          <div className="user-initials">{(row.name || 'S')[0]}</div>
                          <strong>{row.name}</strong>
                        </div>
                      </td>
                      <td>{row.email}</td>
                      <td>{row.testsTaken}</td>
                      <td>{row.accuracy}%</td>
                      <td><span className="xp-highlight">{row.totalXP} XP</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyLeaderboard;
