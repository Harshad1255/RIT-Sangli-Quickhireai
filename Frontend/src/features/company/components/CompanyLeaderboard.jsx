import { useState, useEffect } from 'react';
import { api } from '../../../shared/services/api';
import { getApiBaseUrl } from '../../../config/api';
import CompanySidebar from './CompanySidebar';
import '../styles/CompanyLeaderboard.css';

const CompanyLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTest]);

  const fetchTests = async () => {
    try {
      const res = await api.get('/aptitude/company');
      if (res.data && res.data.success) {
        setTests(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching tests:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/aptitude/company/leaderboard?testId=${selectedTest}`);
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
          <p>{selectedTest === 'all' ? 'Rankings based on total performance across your Aptitude Tests' : 'Rankings for the selected test'}</p>
          
          <div style={{ marginTop: '1rem', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <select 
              value={selectedTest} 
              onChange={(e) => setSelectedTest(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                minWidth: '300px',
                fontSize: '15px'
              }}
            >
              <option value="all">All Tests (Aggregated)</option>
              {tests.map(t => (
                <option key={t._id} value={t._id}>{t.title} {t.entranceCode ? `(Code: ${t.entranceCode})` : ''}</option>
              ))}
            </select>
            
            {selectedTest !== 'all' && leaderboard.length > 0 && (
              <button 
                onClick={() => window.open(`${getApiBaseUrl()}/aptitude/company/tests/${selectedTest}/leaderboard/pdf?token=${localStorage.getItem('token')}`, '_blank')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Download PDF
              </button>
            )}
          </div>
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
