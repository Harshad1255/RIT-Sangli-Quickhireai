import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../shared/services/api';
import SuspiciousActivityMonitor from '../../interview/components/SuspiciousActivityMonitor';
import '../styles/AptitudeTestAttempt.css';

const AptitudeTestAttempt = ({ test, onExit, mode = 'take' }) => {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeSection, setActiveSection] = useState('General');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Proctoring tracking state
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    const startOrLoadAttempt = async () => {
      try {
        setLoading(true);
        if (mode === 'result') {
          // Fetch completed attempt result
          const res = await api.get(`/aptitude/attempt/${test._id}/result`);
          if (res.data && res.data.success) {
            setResult(res.data.data);
          }
        } else {
          // Start attempt
          const res = await api.post(`/aptitude/${test._id}/start`);
          if (res.data && res.data.success) {
            const data = res.data.data;
            setAttempt(data);
            setRemainingSeconds(data.remainingSeconds);
            if (data.sections && data.sections.length > 0) {
              setActiveSection(data.sections[0].name);
            }
          }
        }
      } catch (err) {
        console.error('Error loading aptitude test attempt:', err);
        setError(err.message || 'Failed to initialize test attempt');
      } finally {
        setLoading(false);
      }
    };

    startOrLoadAttempt();
  }, [test._id, mode]);

  // Tab switch listener for proctoring
  useEffect(() => {
    if (mode === 'result' || !attempt) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setSuspiciousActivities(prev => [
          ...prev,
          {
            type: 'tab_switch',
            message: 'Switched tab or minimized browser window',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mode, attempt]);

  // Countdown timer
  useEffect(() => {
    if (mode === 'result' || !attempt || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [mode, attempt]);

  const handleAutoSubmit = async () => {
    if (!attempt) return;
    try {
      const res = await api.post(`/aptitude/attempt/${attempt.attemptId}/submit`, {
        autoSubmitted: true,
        timeRemainingSnapshot: 0
      });
      if (res.data && res.data.success) {
        // Fetch scored result
        const resultRes = await api.get(`/aptitude/attempt/${attempt.attemptId}/result`);
        if (resultRes.data && resultRes.data.success) {
          setResult(resultRes.data.data);
        }
      }
    } catch (err) {
      console.error('Auto-submit error:', err);
    }
  };

  const handleSaveAnswer = async (newAnswers, targetIdx) => {
    if (!attempt) return;
    const studentAns = newAnswers.find(a => a.questionIndex === targetIdx);
    if (!studentAns) return;

    try {
      await api.patch(`/api/aptitude/attempt/${attempt.attemptId}/answer`, {
        questionIndex: targetIdx,
        selectedIndex: studentAns.selectedIndex,
        markedForReview: studentAns.markedForReview,
        timeSpentSeconds: studentAns.timeSpentSeconds || 0
      });
    } catch (err) {
      console.error('Error auto-saving response:', err);
    }
  };

  const handleSelectOption = (optIdx) => {
    if (!attempt) return;
    const updatedAnswers = [...attempt.answers];
    const ansIdx = updatedAnswers.findIndex(a => a.questionIndex === currentIdx);
    if (ansIdx !== -1) {
      updatedAnswers[ansIdx].selectedIndex = optIdx;
    } else {
      updatedAnswers.push({
        questionIndex: currentIdx,
        selectedIndex: optIdx,
        markedForReview: false,
        timeSpentSeconds: 0
      });
    }
    setAttempt({ ...attempt, answers: updatedAnswers });
    handleSaveAnswer(updatedAnswers, currentIdx);
  };

  const handleToggleReview = () => {
    if (!attempt) return;
    const updatedAnswers = [...attempt.answers];
    const ansIdx = updatedAnswers.findIndex(a => a.questionIndex === currentIdx);
    if (ansIdx !== -1) {
      updatedAnswers[ansIdx].markedForReview = !updatedAnswers[ansIdx].markedForReview;
    } else {
      updatedAnswers.push({
        questionIndex: currentIdx,
        selectedIndex: -1,
        markedForReview: true,
        timeSpentSeconds: 0
      });
    }
    setAttempt({ ...attempt, answers: updatedAnswers });
    handleSaveAnswer(updatedAnswers, currentIdx);
  };

  const handleClearResponse = () => {
    if (!attempt) return;
    const updatedAnswers = [...attempt.answers];
    const ansIdx = updatedAnswers.findIndex(a => a.questionIndex === currentIdx);
    if (ansIdx !== -1) {
      updatedAnswers[ansIdx].selectedIndex = -1;
    }
    setAttempt({ ...attempt, answers: updatedAnswers });
    handleSaveAnswer(updatedAnswers, currentIdx);
  };

  const handleSubmitTest = async () => {
    if (!attempt) return;
    try {
      setLoading(true);
      const res = await api.post(`/aptitude/attempt/${attempt.attemptId}/submit`, {
        autoSubmitted: false,
        timeRemainingSnapshot: remainingSeconds
      });
      if (res.data && res.data.success) {
        const resultRes = await api.get(`/aptitude/attempt/${attempt.attemptId}/result`);
        if (resultRes.data && resultRes.data.success) {
          setResult(resultRes.data.data);
          setShowConfirmSubmit(false);
        }
      }
    } catch (err) {
      alert(err.message || 'Error submitting test');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading test environment...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>
        <h3>Error loading test</h3>
        <p>{error}</p>
        <button className="btn-secondary" onClick={onExit}>Back to List</button>
      </div>
    );
  }

  // RESULT SCREEN
  if (result) {
    return (
      <div className="results-screen">
        <div style={{ display: 'flex', justifySelf: 'space-between', alignItems: 'center' }}>
          <h2>Test Results: {result.testTitle}</h2>
          <span className={result.passed ? 'badge-pass' : 'badge-fail'} style={{ fontSize: '1.1rem', padding: '6px 14px' }}>
            {result.passed ? 'PASSED' : 'FAILED'} ({result.percentage}%)
          </span>
        </div>

        <div className="results-summary-cards">
          <div className="summary-card">
            <div className="summary-card-val">{result.totalScore} / {result.maxScore}</div>
            <div>Score Earned</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-val">{result.accuracy}%</div>
            <div>Accuracy</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-val">{result.correctCount} / {result.totalQuestions}</div>
            <div>Correct Answers</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-val">{result.passThreshold}%</div>
            <div>Pass Threshold</div>
          </div>
        </div>

        <h3>Section Breakdown</h3>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Correct</th>
              <th>Incorrect</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {(result.sectionScores || []).map((sec, idx) => (
              <tr key={idx}>
                <td><strong>{sec.sectionName}</strong></td>
                <td style={{ color: '#059669' }}>{sec.correct}</td>
                <td style={{ color: '#dc2626' }}>{sec.incorrect}</td>
                <td>{sec.score}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {result.questions && result.questions.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3>Question Review & Explanations</h3>
            {result.questions.map((q, idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Q{idx + 1}: {q.text} ({q.marks} marks)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {q.options.map((opt, optIdx) => {
                    const isStudentSel = q.selectedIndex === optIdx;
                    const isCorrectOpt = q.correctIndex === optIdx;
                    return (
                      <div
                        key={optIdx}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                          background: isCorrectOpt ? '#d1fae5' : (isStudentSel ? '#fee2e2' : 'white')
                        }}
                      >
                        {opt} {isCorrectOpt ? ' ✅ (Correct)' : ''} {isStudentSel && !isCorrectOpt ? ' ❌ (Your Answer)' : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button className="btn-primary" onClick={onExit}>
            <i className="fas fa-arrow-left"></i> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ATTEMPT SCREEN
  const currentQuestion = attempt?.questions?.[currentIdx];
  const studentAns = attempt?.answers?.find(a => a.questionIndex === currentIdx);
  const sections = attempt?.sections || [{ name: 'General' }];

  // Filter questions for activeSection
  const sectionQuestions = (attempt?.questions || []).filter(
    q => (q.sectionName || 'General') === activeSection
  );

  return (
    <div className="aptitude-attempt-container">
      <div className="attempt-topbar">
        <div className="attempt-title">
          <h2>{attempt?.title}</h2>
        </div>
        <div className="attempt-topbar-right">
          <SuspiciousActivityMonitor
            isActive={true}
            suspiciousActivities={suspiciousActivities}
            tabSwitchCount={tabSwitchCount}
            onActivityReport={() => {}}
          />
          <div className={`timer-badge ${remainingSeconds < 300 ? 'timer-warning' : ''}`}>
            <i className="fas fa-clock"></i>
            <span>{formatTime(remainingSeconds)}</span>
          </div>
          <button className="btn-primary" style={{ background: '#10b981' }} onClick={() => setShowConfirmSubmit(true)}>
            Submit Test
          </button>
        </div>
      </div>

      <div className="attempt-body">
        <div className="attempt-main">
          <div>
            <div className="section-tabs">
              {sections.map((sec, idx) => (
                <button
                  key={idx}
                  className={`section-tab-btn ${activeSection === sec.name ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection(sec.name);
                    const firstQIdx = attempt.questions.findIndex(
                      q => (q.sectionName || 'General') === sec.name
                    );
                    if (firstQIdx !== -1) setCurrentIdx(firstQIdx);
                  }}
                >
                  {sec.name}
                </button>
              ))}
            </div>

            {currentQuestion ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#64748b' }}>
                  <span>Question {currentIdx + 1} of {attempt.questions.length}</span>
                  <span>+{currentQuestion.marks} marks / -{currentQuestion.negativeMarks} penalty</span>
                </div>
                <div className="question-text">{currentQuestion.text}</div>

                <div className="options-list">
                  {(currentQuestion.options || []).map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`option-item ${studentAns?.selectedIndex === optIdx ? 'selected' : ''}`}
                      onClick={() => handleSelectOption(optIdx)}
                    >
                      <input
                        type="radio"
                        name={`question-${currentIdx}`}
                        checked={studentAns?.selectedIndex === optIdx}
                        onChange={() => {}}
                      />
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>No questions in this section.</div>
            )}
          </div>

          <div className="attempt-nav-bar">
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClearResponse}
                disabled={!studentAns || studentAns.selectedIndex === -1}
              >
                Clear Response
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={studentAns?.markedForReview || false}
                  onChange={handleToggleReview}
                />
                Mark for Review
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              >
                &larr; Previous
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={currentIdx === attempt.questions.length - 1}
                onClick={() => setCurrentIdx(prev => Math.min(attempt.questions.length - 1, prev + 1))}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>

        <div className="attempt-sidebar">
          <h4 style={{ margin: '0 0 8px 0' }}>Question Palette</h4>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
            Click a question number to jump directly.
          </div>

          <div className="palette-grid">
            {(attempt?.questions || []).map((q, idx) => {
              const ans = attempt.answers?.find(a => a.questionIndex === idx);
              const isAnswered = ans && ans.selectedIndex !== undefined && ans.selectedIndex >= 0;
              const isMarked = ans && ans.markedForReview;
              const isCurrent = idx === currentIdx;

              let btnClass = 'palette-btn';
              if (isMarked) btnClass += ' palette-marked';
              else if (isAnswered) btnClass += ' palette-answered';
              if (isCurrent) btnClass += ' palette-current';

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => setCurrentIdx(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showConfirmSubmit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <h3>Ready to Submit?</h3>
            <p>You have answered {attempt.answers.filter(a => a.selectedIndex >= 0).length} of {attempt.questions.length} questions.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowConfirmSubmit(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: '#10b981' }} onClick={handleSubmitTest}>
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AptitudeTestAttempt;
