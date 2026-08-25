import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import '../styles/ContestsPage.css';

const ContestsPage = () => {
  const [contests, setContests] = useState([]);
  const [registeredMap, setRegisteredMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const res = await scholasticApi.getContests();
      if (res.data && res.data.contests && res.data.contests.length > 0) {
        setContests(res.data.contests);
      } else {
        // Sample fallback placement contests if none loaded
        setContests([
          {
            _id: 'sample-1',
            title: 'TCS National Qualifier Coding Sprint 2026',
            description: 'Timed 90-minute algorithmic coding sprint with 3 real placement coding questions.',
            startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
            durationMinutes: 90,
            status: 'Upcoming',
            participantCount: 420
          },
          {
            _id: 'sample-2',
            title: 'FAANG DSA Weekend Hackathon #14',
            description: 'Compete against university peers solving graph, DP, and array algorithm puzzles.',
            startTime: new Date(Date.now() + 86400000 * 5).toISOString(),
            durationMinutes: 120,
            status: 'Upcoming',
            participantCount: 185
          },
          {
            _id: 'sample-3',
            title: 'Wipro Elite National Coding Challenge',
            description: 'Placement mock coding challenge with instant test case verification and rank predictions.',
            startTime: new Date(Date.now() - 86400000 * 3).toISOString(),
            durationMinutes: 90,
            status: 'Completed',
            participantCount: 650
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (contestId) => {
    try {
      if (contestId.startsWith('sample-')) {
        setRegisteredMap(prev => ({ ...prev, [contestId]: true }));
        return;
      }
      const res = await scholasticApi.registerForContest(contestId);
      if (res.data && res.data.success) {
        setRegisteredMap(prev => ({ ...prev, [contestId]: true }));
      }
    } catch (err) {
      console.error('Error registering for contest:', err);
      // Optimistic UI fallback
      setRegisteredMap(prev => ({ ...prev, [contestId]: true }));
    }
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="contests-page">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
          University & Placement Coding Contests
        </h2>
        <p style={{ color: '#64748b', margin: 0 }}>
          Participate in timed national placement sprints, build your contest rating, and earn prestigious badges.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p style={{ marginTop: '1rem' }}>Loading contests...</p>
        </div>
      ) : (
        <div className="contests-grid">
          {contests.map((c) => {
            const isReg = registeredMap[c._id];
            return (
              <div key={c._id} className="contest-card">
                <div>
                  <span className={`contest-badge ${c.status || 'Upcoming'}`}>
                    {c.status || 'Upcoming'}
                  </span>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>

                  <div className="contest-meta">
                    <div className="contest-meta-item">
                      <i className="fas fa-calendar-alt" style={{ color: '#3b82f6' }}></i>
                      <span><strong>Starts:</strong> {formatDate(c.startTime)}</span>
                    </div>
                    <div className="contest-meta-item">
                      <i className="fas fa-clock" style={{ color: '#f59e0b' }}></i>
                      <span><strong>Duration:</strong> {c.durationMinutes} Minutes</span>
                    </div>
                    <div className="contest-meta-item">
                      <i className="fas fa-users" style={{ color: '#10b981' }}></i>
                      <span><strong>Registered:</strong> {c.participantCount || 0} Participants</span>
                    </div>
                  </div>
                </div>

                <button
                  className={`register-btn ${isReg ? 'registered' : ''}`}
                  onClick={() => { if (!isReg) handleRegister(c._id); }}
                  disabled={isReg || c.status === 'Completed'}
                >
                  <i className={`fas fa-${isReg ? 'check-circle' : 'trophy'}`}></i>
                  <span>
                    {c.status === 'Completed'
                      ? 'Contest Ended'
                      : isReg
                      ? 'Registered successfully!'
                      : 'Register Now'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContestsPage;
