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
        const visibleTests = (res.data.data || []).filter(test => {
          return test.accessGranted === true || test.studentStatus === 'In Progress' || test.studentStatus === 'Completed';
        });
        setTests(visibleTests);
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

  const [confirmRemoveTest, setConfirmRemoveTest] = useState(null);

  const handleRemoveTest = async (testId) => {
    setConfirmRemoveTest(testId);
  };

  const confirmRemoveSelectedTest = async () => {
    if (!confirmRemoveTest) return;
    try {
      setLoading(true);
      await api.post(`/aptitude/${confirmRemoveTest}/hide`);
      fetchAssignedTests();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to remove test');
      setLoading(false);
    } finally {
      setConfirmRemoveTest(null);
    }
  };

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [entranceCode, setEntranceCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [verifiedTest, setVerifiedTest] = useState(null);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const normalizedCode = entranceCode.trim();
    if (!normalizedCode) {
      setJoinError('Please enter a test code.');
      return;
    }

    const uppercaseCode = normalizedCode.toUpperCase();
    setEntranceCode(uppercaseCode);
    setJoinError('');
    setJoinLoading(true);
    setVerifiedTest(null);

    try {
      const res = await api.post('/aptitude/verify-code', { entranceCode: uppercaseCode });
      if (res.data && res.data.success) {
        setVerifiedTest(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setJoinError(err.response?.data?.error || 'Unable to verify the test code. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  useEffect(() => {
    if (!showJoinModal) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowJoinModal(false);
      }
    };

    document.body.classList.add('modal-open');
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showJoinModal]);

  const handleStartJoinedTest = () => {
    if (verifiedTest) {
      setShowJoinModal(false);
      setVerifiedTest(null);
      setEntranceCode('');
      // It acts as if we clicked "Attempt Test" from the list
      onSelectTest(verifiedTest, 'take');
    }
  };

  return (
    <div className="student-aptitude-list">
      <div className="student-aptitude-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Available Aptitude Tests</h2>
          <p>Complete your timed aptitude tests assigned or published by companies.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => {
            setShowJoinModal(true);
            setJoinError('');
            setVerifiedTest(null);
            setEntranceCode('');
          }}
        >
          <i className="fas fa-plus"></i> Join Test via Code
        </button>
      </div>

      {showJoinModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowJoinModal(false); }}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="join-assessment-title" style={{ maxWidth: 500, padding: '1.75rem 1.5rem 1.5rem', borderRadius: '18px', position: 'relative', width: '100%' }}>
            <button
              type="button"
              className="modal-close-button"
              aria-label="Close join assessment modal"
              onClick={() => setShowJoinModal(false)}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>

            <h3 id="join-assessment-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Join Assessment</h3>

            {!verifiedTest ? (
              <form onSubmit={handleVerifyCode} noValidate>
                <p style={{ color: '#475569', marginBottom: '1rem', fontSize: '0.98rem' }}>
                  Enter the entrance code provided by your recruiter.
                </p>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="entrance-code" style={{ display: 'none' }}>Entrance code</label>
                  <input
                    id="entrance-code"
                    type="text"
                    value={entranceCode}
                    onChange={(e) => setEntranceCode(e.target.value.replace(/\s+/g, '').toUpperCase())}
                    placeholder="QH7K9P2M"
                    required
                    maxLength={10}
                    autoComplete="off"
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.2em',
                      fontSize: '1.15rem',
                      textAlign: 'center',
                      border: '1px solid #dbe2ea',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      padding: '0.95rem 1rem',
                      width: '100%' 
                    }}
                  />
                </div>

                {joinError && (
                  <div className="error-message" role="alert" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    {joinError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowJoinModal(false)} disabled={joinLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={joinLoading || entranceCode.trim().length < 6}>
                    {joinLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#111827', fontSize: '1.15rem' }}>{verifiedTest.title}</h4>
                  <div style={{ display: 'grid', gap: '8px', color: '#4b5563' }}>
                    <div><strong>Duration:</strong> {verifiedTest.totalTimeMinutes} minutes</div>
                    <div><strong>Questions:</strong> {verifiedTest.questionsCount}</div>
                    <div><strong>Coding Problems:</strong> {verifiedTest.codingProblemsCount}</div>
                    {verifiedTest.sections && verifiedTest.sections.length > 0 && (
                      <div><strong>Sections:</strong> {verifiedTest.sections.map(s => s.name).join(', ')}</div>
                    )}
                  </div>
                  {verifiedTest.studentStatus === 'Completed' && (
                    <div style={{ marginTop: 15, padding: 10, background: '#e0e7ff', color: '#4338ca', borderRadius: 8, fontWeight: 600 }}>
                      You have already attempted this test. Starting it again will reattempt it.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowJoinModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn-primary" onClick={handleStartJoinedTest}>
                    {verifiedTest.studentStatus === 'Completed' ? 'Reattempt Test' : 'Start Test'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      {confirmRemoveTest && (
        <div className="modal-overlay" aria-modal="true" role="dialog" onClick={(e) => { if (e.target === e.currentTarget) setConfirmRemoveTest(null); }}>
          <div className="modal-content" style={{ maxWidth: 420, padding: '1.5rem' }}>
            <button type="button" className="modal-close-button" aria-label="Close delete confirmation" onClick={() => setConfirmRemoveTest(null)}>
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>Delete Test?</h3>
            <p style={{ color: '#475569', marginBottom: '1.25rem' }}>
              Are you sure you want to remove this test from your list? Your historical results remain intact, but the test will be hidden from this dashboard.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn-secondary" onClick={() => setConfirmRemoveTest(null)}>Cancel</button>
              <button type="button" className="btn-danger" onClick={confirmRemoveSelectedTest}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading available tests...</div>
      ) : tests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <i className="fas fa-lock" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: 16 }}></i>
          <h3 style={{ color: '#111827', marginBottom: 8 }}>No Available Tests</h3>
          <p style={{ color: '#4b5563', fontSize: '1.1rem', marginBottom: 20 }}>
            Have a test code from a company?
          </p>
          <button 
            className="btn-primary" 
            style={{ padding: '10px 24px', fontSize: '1.1rem' }}
            onClick={() => {
              setShowJoinModal(true);
              setJoinError('');
              setVerifiedTest(null);
              setEntranceCode('');
            }}
          >
            <i className="fas fa-plus"></i> Join Test via Code
          </button>
        </div>
      ) : (
        <div className="aptitude-tests-grid">
          {tests.map(test => (
            <div key={test._id} className="aptitude-test-item-card">
              <div>
                <div className="aptitude-test-item-header">
                  <h3>{test.title}</h3>
                  <span className={`status-badge ${test.studentStatus === 'Completed' ? 'status-completed' : test.studentStatus === 'In Progress' ? 'status-in-progress' : test.dueDate && new Date(test.dueDate) < new Date() ? 'status-not-started' : 'status-not-started'}`}>
                    {test.studentStatus || (test.dueDate && new Date(test.dueDate) < new Date() ? 'Expired' : 'Not Started')}
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

              <div className="test-card-footer" style={{ display: 'flex', gap: '10px' }}>
                {test.studentStatus === 'Completed' ? (
                  <>
                    <button
                      className="btn-primary"
                      style={{ background: '#10b981', flex: 1 }}
                      onClick={() => onSelectTest(test, 'result')}
                    >
                      <i className="fas fa-eye"></i> View Result
                    </button>
                    <button
                      className="btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => onSelectTest(test, 'take')}
                    >
                      <i className="fas fa-redo"></i> Reattempt Test
                    </button>
                  </>
                ) : test.dueDate && new Date(test.dueDate) < new Date() ? (
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}
                    disabled
                  >
                    <i className="fas fa-clock"></i> Slot Closed
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => onSelectTest(test, 'take')}
                  >
                    <i className="fas fa-play"></i> {test.studentStatus === 'In Progress' ? 'Resume Test' : 'Attempt Test'}
                  </button>
                )}
                <button
                  className="btn-secondary"
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => handleRemoveTest(test._id)}
                  title="Remove from my list"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAptitudeTestList;
