import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/services/api';
import '../styles/StudentAptitudeTestList.css';

const StudentAptitudeTestList = ({ onSelectTest }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAssignedTests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/aptitude/student');
      if (res.data && res.data.success) {
        setTests(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching student aptitude tests:', err);
      setError(err.message || 'Failed to load assigned aptitude tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedTests();
  }, []);

  const getBadgeClass = (status) => {
    switch (status) {
      case 'In Progress':
        return 'status-in-progress';
      case 'Completed':
        return 'status-completed';
      default:
        return 'status-not-started';
    }
  };

  return (
    <div className="student-aptitude-list">
      <div className="student-aptitude-header">
        <h2>Assigned Aptitude Screening Tests</h2>
        <p>Complete your scheduled timed aptitude tests assigned by hiring companies.</p>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div>Loading your assigned tests...</div>
      ) : tests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <i className="fas fa-clipboard-list" style={{ fontSize: '2.5rem', color: '#9ca3af', marginBottom: 12 }}></i>
          <p style={{ color: '#4b5563', fontSize: '1.1rem' }}>No timed aptitude tests assigned to you at the moment.</p>
        </div>
      ) : (
        <div className="aptitude-tests-grid">
          {tests.map(test => (
            <div key={test._id} className="aptitude-test-item-card">
              <div>
                <div className="aptitude-test-item-header">
                  <h3>{test.title}</h3>
                  <span className={`status-badge ${getBadgeClass(test.studentStatus)}`}>
                    {test.studentStatus || 'Not Started'}
                  </span>
                </div>

                <div className="test-meta-list">
                  <div><strong>Time Limit:</strong> {test.totalTimeMinutes} minutes</div>
                  <div><strong>Questions:</strong> {test.questionsCount || 0}</div>
                  <div><strong>Pass Threshold:</strong> {test.passThreshold}%</div>
                  {test.dueDate && (
                    <div><strong>Due Date:</strong> {new Date(test.dueDate).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              <div className="test-card-footer">
                {test.studentStatus === 'Completed' ? (
                  <button
                    className="btn-primary"
                    style={{ background: '#10b981' }}
                    onClick={() => onSelectTest(test, 'result')}
                  >
                    <i className="fas fa-eye"></i> View Result
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => onSelectTest(test, 'take')}
                  >
                    <i className="fas fa-play"></i> {test.studentStatus === 'In Progress' ? 'Resume Test' : 'Start Test'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAptitudeTestList;
