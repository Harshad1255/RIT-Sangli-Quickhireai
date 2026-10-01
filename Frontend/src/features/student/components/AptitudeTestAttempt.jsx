import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../shared/services/api';
import { getApiBaseUrl } from '../../../config/api';

import '../styles/AptitudeTestAttempt.css';

import ExamSecurityWrapper from '../../../shared/components/assessment/ExamSecurityWrapper';

const InnerAptitudeTestAttempt = ({ test, onExit, mode = 'take', violations = [], preloadedResult, onComplete, sessionId, preCheckData, onAttemptInitialized, onSecurityState }) => {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeSection, setActiveSection] = useState('General');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [result, setResult] = useState(preloadedResult || null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [proctoringReady, setProctoringReady] = useState(false);

  const timerRef = useRef(null);
  const clockRef = useRef({ remainingSeconds: 0, syncedAt: 0 });
  const isSubmittingRef = useRef(false);
  const autoSubmitRef = useRef(null);

  const answerCacheKey = (attemptId) => `aptitude-pending-answers-${attemptId}`;
  const mergeAnswers = (serverAnswers, cachedAnswers) => {
    if (!Array.isArray(cachedAnswers)) return serverAnswers;
    const answerMap = new Map((serverAnswers || []).map(answer => [answer.questionIndex, answer]));
    cachedAnswers.forEach(answer => answerMap.set(answer.questionIndex, { ...answerMap.get(answer.questionIndex), ...answer }));
    return Array.from(answerMap.values());
  };

  useEffect(() => {
    let cancelled = false;

    const startOrLoadAttempt = async () => {
      if (preloadedResult) {
        setLoading(false);
        return;
      }

      if (!test || !test._id) {
        if (!cancelled) {
          setAttempt(null);
          setResult(null);
          setError('No valid test was selected. Please choose a test from the dashboard.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');

        if (mode === 'result') {
          const attemptIdToUse = test.attemptId || test._id;
          const res = await api.get(`/aptitude/attempt/${attemptIdToUse}/result`);
          if (!cancelled && res.data && res.data.success) {
            setResult(res.data.data || null);
            setAttempt(null);
          } else if (!cancelled) {
            throw new Error(res.data?.error || 'Unable to load the result for this test.');
          }
        } else {
          const res = await api.post(`/aptitude/${test._id}/start`, { sessionId });
          if (!cancelled && res.data && res.data.success) {
            const data = res.data.data || {};
            if (!Array.isArray(data.questions) || data.questions.length === 0) {
              throw new Error('This test does not contain any questions to load.');
            }
            let cachedAnswers = [];
            try {
              cachedAnswers = JSON.parse(localStorage.getItem(answerCacheKey(data.attemptId)) || '[]');
            } catch {
              cachedAnswers = [];
            }
            data.answers = mergeAnswers(data.answers, cachedAnswers);
            
            // Post reference photo if we have it
            if (preCheckData && preCheckData.referencePhoto) {
              try {
                const formData = new FormData();
                formData.append('referencePhoto', preCheckData.referencePhoto, 'reference.jpg');
                formData.append('consentAccepted', preCheckData.consentAccepted);
                formData.append('attemptId', data.attemptId);
                formData.append('assessmentType', 'aptitude');
                // Optional: we can add HMAC signature here if we had hmacSecret, but hmacSecret is returned by /start.
                // init-proctoring API is protected by candidate auth, so it's fine.
                await api.post('/assessment/init-proctoring', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
              } catch (e) {
                console.warn('Failed to upload proctoring reference photo', e);
              }
            }
            
            setAttempt(data);
            setResult(null);
            setRemainingSeconds(Number(data.remainingSeconds) || 0);
            clockRef.current = { remainingSeconds: Number(data.remainingSeconds) || 0, syncedAt: performance.now() };
            onAttemptInitialized?.(data);
            onSecurityState?.(Number(data.violationCount) || 0, Number(data.maxViolationCount) || 3);
            if (Array.isArray(data.sections) && data.sections.length > 0) {
              setActiveSection(data.sections[0].name);
            } else {
              setActiveSection('General');
            }
          } else if (!cancelled) {
            throw new Error(res.data?.error || 'Failed to start test attempt.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading aptitude test attempt:', err);
          setError(err.message || 'Failed to initialize test attempt');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    startOrLoadAttempt();
    return () => {
      cancelled = true;
    };
  }, [test?._id, mode, sessionId]);

  // Display time from a server-calibrated monotonic clock; wall-clock changes cannot extend the attempt.
  useEffect(() => {
    if (mode === 'result' || !attempt) return undefined;

    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - clockRef.current.syncedAt) / 1000;
      const nextSeconds = Math.max(0, Math.ceil(clockRef.current.remainingSeconds - elapsed));
      setRemainingSeconds(nextSeconds);
      if (nextSeconds <= 0 && !isSubmittingRef.current) {
          clearInterval(timerRef.current);
          autoSubmitRef.current?.();
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [mode, attempt?.attemptId]);

  const handleAutoSubmit = async () => {
    if (!attempt || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await api.post(`/aptitude/attempt/${attempt.attemptId}/submit`, {
        autoSubmitted: true,
        timeRemainingSnapshot: 0,
        violations,
        sessionId
      });
      if (res.data && res.data.success) {
        // Fetch scored result
        const resultRes = await api.get(`/aptitude/attempt/${attempt.attemptId}/result`);
        if (resultRes.data && resultRes.data.success) {
          setResult(resultRes.data.data);
          if (onComplete) {
            onComplete(resultRes.data.data);
          }
        }
      }
    } catch (err) {
      console.error('Auto-submit error:', err);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  autoSubmitRef.current = handleAutoSubmit;

  useEffect(() => {
    if (mode === 'result' || !attempt) return undefined;
    let cancelled = false;
    const syncFromServer = async () => {
      if (!navigator.onLine) return;
      try {
        const response = await api.post('/assessment/heartbeat', { attemptId: attempt.attemptId, sessionId });
        if (cancelled || !response.data?.success) return;
        const serverRemaining = Number(response.data.remainingSeconds) || 0;
        clockRef.current = { remainingSeconds: serverRemaining, syncedAt: performance.now() };
        setRemainingSeconds(serverRemaining);
        onSecurityState?.(Number(response.data.violationCount) || 0, Number(response.data.maxViolationCount) || 3);
      } catch (syncError) {
        if (cancelled) return;
        if (/different session|another browser session|MULTIPLE_SESSION/i.test(syncError.message || '')) {
          setSessionConflict(true);
          return;
        }
        if (/TEST_EXPIRED|expired/i.test(syncError.message || '')) {
          autoSubmitRef.current?.();
        }
      }
    };
    syncFromServer();
    const interval = setInterval(syncFromServer, 30000);
    window.addEventListener('online', syncFromServer);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online', syncFromServer);
    };
  }, [mode, attempt?.attemptId, sessionId]);

  useEffect(() => {
    if (mode === 'result' || !attempt) return undefined;
    const savePendingAnswers = async () => {
      if (!navigator.onLine) return;
      const answers = (attempt.answers || []).map(answer => ({
        questionIndex: answer.questionIndex,
        selectedAnswer: answer.selectedAnswer ?? null,
        markedForReview: !!answer.markedForReview,
        timeSpentSeconds: Number(answer.timeSpentSeconds) || 0
      }));
      try {
        await api.post(`/aptitude/attempt/${attempt.attemptId}/answers`, { answers, sessionId });
        localStorage.removeItem(answerCacheKey(attempt.attemptId));
      } catch (saveError) {
        if (/MULTIPLE_SESSION|another browser session/i.test(saveError.message || '')) setSessionConflict(true);
      }
    };
    const interval = setInterval(savePendingAnswers, 5000);
    window.addEventListener('online', savePendingAnswers);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', savePendingAnswers);
    };
  }, [mode, attempt, sessionId]);

  const handleSaveAnswer = async (newAnswers, targetIdx) => {
    if (!attempt) return;
    const studentAns = newAnswers.find(a => a.questionIndex === targetIdx);
    if (!studentAns) return;

    try {
      localStorage.setItem(answerCacheKey(attempt.attemptId), JSON.stringify(newAnswers));
      if (!navigator.onLine) return;
      await api.patch(`/aptitude/attempt/${attempt.attemptId}/answer`, {
        questionIndex: targetIdx,
        selectedAnswer: studentAns.selectedAnswer,
        markedForReview: studentAns.markedForReview,
        timeSpentSeconds: studentAns.timeSpentSeconds || 0,
        sessionId
      });
    } catch (err) {
      console.error('Error auto-saving response:', err);
    }
  };

  const handleSelectOption = (index) => {
    if (!attempt) return;
    const updatedAnswers = [...attempt.answers];
    const ansIdx = updatedAnswers.findIndex(a => a.questionIndex === currentIdx);
    if (ansIdx !== -1) {
      updatedAnswers[ansIdx].selectedAnswer = index;
    } else {
      updatedAnswers.push({
        questionIndex: currentIdx,
        selectedAnswer: index,
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
        selectedAnswer: null,
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
      updatedAnswers[ansIdx].selectedAnswer = null;
    }
    setAttempt({ ...attempt, answers: updatedAnswers });
    handleSaveAnswer(updatedAnswers, currentIdx);
  };

  const handleSubmitTest = async () => {
    if (!attempt || isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await api.post(`/aptitude/attempt/${attempt.attemptId}/submit`, {
        autoSubmitted: false,
        timeRemainingSnapshot: remainingSeconds,
        violations,
        sessionId
      });
      if (res.data && res.data.success) {
        const resultRes = await api.get(`/aptitude/attempt/${attempt.attemptId}/result`);
        if (resultRes.data && resultRes.data.success) {
          localStorage.removeItem(answerCacheKey(attempt.attemptId));
          setResult(resultRes.data.data);
          setShowConfirmSubmit(false);
          if (onComplete) {
            onComplete(resultRes.data.data);
          }
        }
      }
    } catch (err) {
      alert(err.message || 'Error submitting test');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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

  const handleDownloadReport = async () => {
    try {
      const res = await api.get(`/aptitude/attempt/${result.attemptId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Assessment_Report_${result.testTitle.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF report');
    }
  };

  // RESULT SCREEN
  if (result) {
    const violationsCount = Number(result.violationsCount ?? result.securitySummary?.totalViolations ?? 0);
    const cleanlinessScore = Number(result.cleanlinessScore ?? Math.max(0, Math.min(100, 100 - (violationsCount * 15))));
    const integrityLabel = violationsCount === 0 ? 'Completely clean attempt' : violationsCount <= 2 ? 'Mostly clean attempt' : 'Needs improvement';

    return (
      <div className="results-screen" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontSize: '2.2rem', color: '#0f172a', margin: '0 0 10px 0' }}>Performance Report</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>{result.testTitle}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              padding: '8px 20px',
              borderRadius: '30px',
              backgroundColor: result.passed ? '#dcfce7' : '#fee2e2',
              color: result.passed ? '#16a34a' : '#dc2626',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              {result.passed ? 'PASSED' : 'FAILED'} ({result.percentage}%)
            </span>
            <button onClick={handleDownloadReport} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-download"></i> Download PDF
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', marginBottom: '5px' }}>{result.totalScore}<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/{result.maxScore}</span></div>
            <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Total Score</div>
          </div>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#8b5cf6', marginBottom: '5px' }}>{result.accuracy}%</div>
            <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Accuracy</div>
          </div>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', marginBottom: '5px' }}>{result.correctCount}<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/{result.totalQuestions}</span></div>
            <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Correct</div>
          </div>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: cleanlinessScore >= 80 ? '#10b981' : '#f59e0b', marginBottom: '5px' }}>{cleanlinessScore}%</div>
            <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Cleanliness</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', marginBottom: '40px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>Section Performance</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {(result.sectionScores || []).map((sec, idx) => (
                <div key={idx} style={{ marginBottom: idx !== result.sectionScores.length - 1 ? '24px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{sec.sectionName}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{sec.score} pts</span>
                  </div>
                  <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#f1f5f9' }}>
                    <div style={{ width: `${(sec.correct / Math.max(1, sec.correct + sec.incorrect)) * 100}%`, background: '#10b981' }}></div>
                    <div style={{ width: `${(sec.incorrect / Math.max(1, sec.correct + sec.incorrect)) * 100}%`, background: '#ef4444' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
                    <span>{sec.correct} Correct</span>
                    <span>{sec.incorrect} Incorrect</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: violationsCount === 0 ? '#f0fdf4' : '#fff7ed', border: `1px solid ${violationsCount === 0 ? '#bbf7d0' : '#fed7aa'}`, borderRadius: '16px', padding: '24px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: violationsCount === 0 ? '#dcfce7' : '#ffedd5', color: violationsCount === 0 ? '#16a34a' : '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              <i className={`fas fa-${violationsCount === 0 ? 'shield-check' : 'shield-alt'}`}></i>
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: violationsCount === 0 ? '#166534' : '#9a3412', fontSize: '1.3rem' }}>Exam Integrity: {integrityLabel}</h3>
              <p style={{ margin: 0, color: violationsCount === 0 ? '#15803d' : '#c2410c' }}>
                {violationsCount === 0 ? 'No security violations were detected during your assessment.' : `Detected ${violationsCount} security violation${violationsCount > 1 ? 's' : ''} during the test.`}
              </p>
            </div>
          </div>
          {Array.isArray(result.violationEvents) && result.violationEvents.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #fdba74' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#9a3412' }}>Violation Log</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#7c2d12' }}>
                {result.violationEvents.map((event, idx) => (
                  <li key={`${event.type}-${idx}`} style={{ marginBottom: '8px' }}>
                    <strong>{event.type.replace(/_/g, ' ')}</strong> · {event.severity} · {new Date(event.timestamp).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {result.questions && result.questions.length > 0 && (
          <div>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Detailed Answer Review</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {result.questions.map((q, idx) => {
                const isStudentCorrect = q.selectedAnswer === q.correctIndex;
                const isSkipped = q.selectedAnswer === undefined || q.selectedAnswer === null;
                
                return (
                  <div key={idx} style={{ 
                    background: '#fff', 
                    borderRadius: '16px', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)', 
                    border: '1px solid #e2e8f0', 
                    borderLeft: `6px solid ${isStudentCorrect ? '#10b981' : isSkipped ? '#94a3b8' : '#ef4444'}`,
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1e293b', flex: 1, paddingRight: '20px' }}>
                        <span style={{ color: '#64748b', marginRight: '10px' }}>Q{idx + 1}.</span> {q.text}
                      </div>
                      <span style={{ 
                        padding: '6px 14px', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem', 
                        fontWeight: 700,
                        background: isStudentCorrect ? '#dcfce7' : isSkipped ? '#f1f5f9' : '#fee2e2',
                        color: isStudentCorrect ? '#16a34a' : isSkipped ? '#64748b' : '#dc2626'
                      }}>
                        {isStudentCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Incorrect'} ({q.marks} marks)
                      </span>
                    </div>
                    <div style={{ padding: '20px 24px', background: '#f8fafc' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                        {q.options.map((opt, optIdx) => {
                          const actualIdx = opt.originalIndex !== undefined ? opt.originalIndex : optIdx;
                          const isStudentSel = q.selectedAnswer === actualIdx;
                          const isCorrectOpt = q.correctIndex === actualIdx;
                          
                          let bg = '#fff';
                          let border = '1px solid #e2e8f0';
                          if (isCorrectOpt) { bg = '#dcfce7'; border = '1px solid #22c55e'; }
                          else if (isStudentSel) { bg = '#fee2e2'; border = '1px solid #ef4444'; }

                          return (
                            <div key={optIdx} style={{ padding: '12px 16px', borderRadius: '8px', background: bg, border: border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#334155', fontWeight: (isCorrectOpt || isStudentSel) ? 600 : 400 }}>{opt.text || opt}</span>
                              {isCorrectOpt && <i className="fas fa-check-circle" style={{ color: '#16a34a', fontSize: '1.2rem' }}></i>}
                              {isStudentSel && !isCorrectOpt && <i className="fas fa-times-circle" style={{ color: '#dc2626', fontSize: '1.2rem' }}></i>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <button className="btn-primary" onClick={onExit} style={{ padding: '12px 30px', fontSize: '1.1rem', borderRadius: '8px' }}>
            <i className="fas fa-arrow-left"></i> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!attempt && !loading && !result && !error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#334155' }}>
        <h3>Test not available</h3>
        <p>The requested assessment could not be loaded.</p>
        <button className="btn-secondary" onClick={onExit}>Back to List</button>
      </div>
    );
  }

  // ATTEMPT SCREEN
  const currentQuestion = attempt?.questions?.[currentIdx];
  const studentAns = attempt?.answers?.find(a => a.questionIndex === currentIdx);
  const sections = attempt?.sections || [{ name: 'General' }];

  if (!attempt && !result) {
    return null;
  }

  if (sessionConflict) {
    return (
      <div role="alert" style={{ position: 'fixed', inset: 0, zIndex: 1005, display: 'grid', placeItems: 'center', background: 'rgba(15, 23, 42, 0.94)', color: '#fff', textAlign: 'center', padding: 24 }}>
        <div>
          <h2>Assessment session conflict</h2>
          <p>This attempt is active in another browser session. Answers are blocked to protect the attempt.</p>
        </div>
      </div>
    );
  }

  if (attempt && (!Array.isArray(attempt.questions) || attempt.questions.length === 0)) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#334155' }}>
        <h3>No questions available</h3>
        <p>This assessment has no questions to display right now.</p>
        <button className="btn-secondary" onClick={onExit}>Back to List</button>
      </div>
    );
  }

  // Filter questions for activeSection
  const sectionQuestions = (attempt?.questions || []).filter(
    q => (q.sectionName || 'General') === activeSection
  );

  return (
    <div className="aptitude-attempt-container">
      <div className="attempt-topbar">
        <div className="attempt-title-wrap">
          <div className="brand-pill"><i className="fas fa-briefcase" /> QuickHire AI</div>
          <div className="attempt-title">
            <h2>{attempt?.title}</h2>
            <span>{attempt?.candidateName || 'Candidate'}</span>
          </div>
        </div>
        <div className="attempt-topbar-right">
          <div className="progress-meter">
            <span>{Math.round(((currentIdx + 1) / Math.max(1, attempt.questions.length)) * 100)}%</span>
            <small>Progress</small>
          </div>
          <div className={`timer-badge ${remainingSeconds < 300 ? 'timer-warning' : ''}`}>
            <i className="fas fa-clock"></i>
            <span>{formatTime(remainingSeconds)}</span>
          </div>
          <div className="status-indicator online">Live</div>
          <button
            className="btn-primary"
            style={{ background: '#10b981' }}
            onClick={() => !isSubmitting && setShowConfirmSubmit(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Test'}
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
              {attempt.codingProblems && attempt.codingProblems.length > 0 && (
                <button
                  className={`section-tab-btn ${activeSection === 'Coding' ? 'active' : ''}`}
                  onClick={() => setActiveSection('Coding')}
                  style={{ background: activeSection === 'Coding' ? '#6366f1' : '#e0e7ff', color: activeSection === 'Coding' ? 'white' : '#4338ca', fontWeight: 'bold' }}
                >
                  Coding ({attempt.codingProblems.length})
                </button>
              )}
            </div>

            {activeSection === 'Coding' ? (
              <div style={{ padding: '20px 0' }}>
                <p style={{ color: '#4b5563', marginBottom: 16 }}>
                  Please complete the following coding problems. Click 'Open Editor' to start coding in a full-screen proctored environment.
                </p>
                {attempt.codingProblems.map((prob, idx) => {
                  const ans = attempt.codingAnswers?.find(ca => ca.problemId === prob._id);
                  return (
                    <div key={prob._id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0' }}>{prob.title} <span className={`badge-difficulty difficulty-${prob.difficulty}`}>{prob.difficulty}</span></h4>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Status: <strong style={{ color: ans && ans.status === 'Solved' ? '#10b981' : (ans && ans.status === 'Attempted' ? '#f59e0b' : '#64748b') }}>{ans ? ans.status : 'Not Attempted'}</strong>
                        </div>
                      </div>
                      <button 
                        className="btn-primary" 
                        onClick={() => window.open(`/candidate/test/${test._id}/coding/${prob._id}`, '_blank')}
                      >
                        Open Editor <i className="fas fa-external-link-alt" style={{ marginLeft: 6 }}></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : currentQuestion ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#64748b' }}>
                  <span>Question {currentIdx + 1} of {attempt.questions.length}</span>
                  <span>+{currentQuestion.marks} marks / -{currentQuestion.negativeMarks} penalty</span>
                </div>
                <div className="question-text">{currentQuestion.text}</div>
                {currentQuestion.imageUrl && (
                  <div className="question-visual" style={{ margin: '15px 0' }}>
                    <img src={`${getApiBaseUrl().replace('/api', '')}${currentQuestion.imageUrl}`} alt="Question visual" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px' }} />
                  </div>
                )}

                <div className="options-list">
                  {(currentQuestion.options || []).map((opt, optIdx) => {
                    const actualIdx = opt.originalIndex !== undefined ? opt.originalIndex : optIdx;
                    const optText = opt.text || opt;
                    return (
                    <div
                      key={actualIdx}
                      className={`option-item ${studentAns?.selectedAnswer === actualIdx ? 'selected' : ''}`}
                      onClick={() => handleSelectOption(actualIdx)}
                    >
                      <input
                        type="radio"
                        name={`question-${currentIdx}`}
                        checked={studentAns?.selectedAnswer === actualIdx}
                        onChange={() => {}}
                      />
                      <span>{optText}</span>
                    </div>
                  )})}
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
                disabled={!studentAns || studentAns.selectedAnswer === null || studentAns.selectedAnswer === undefined}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 14, height: 14, background: '#d1fae5', border: '1px solid #34d399', borderRadius: 3 }}></div> Answered</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 14, height: 14, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 3 }}></div> Unanswered</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 14, height: 14, background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 3 }}></div> Marked</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 14, height: 14, background: 'transparent', border: '2px solid #3b82f6', borderRadius: 3 }}></div> Current</div>
          </div>

          <div className="palette-grid">
            {(attempt?.questions || []).map((q, idx) => {
              const ans = attempt.answers?.find(a => a.questionIndex === idx);
              const isAnswered = ans && ans.selectedAnswer !== undefined && ans.selectedAnswer !== null;
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

          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <button 
              className="btn-primary" 
              style={{ width: '100%', background: '#ef4444' }} 
              onClick={() => setShowConfirmSubmit(true)}
            >
              Submit Assessment
            </button>
          </div>
        </div>
      </div>

      {showConfirmSubmit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <h3>Ready to Submit?</h3>
            <p>You have answered {(attempt.answers || []).filter(a => a.selectedAnswer !== undefined && a.selectedAnswer !== null).length} of {(attempt.questions || []).length} questions.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowConfirmSubmit(false)} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: '#10b981' }} onClick={handleSubmitTest} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AptitudeTestAttempt = ({ test, onExit, mode = 'take' }) => {
  const [completedResult, setCompletedResult] = useState(null);
  const [examActive, setExamActive] = useState(false);
  const [securityViolations, setSecurityViolations] = useState([]);
  const [securitySessionId, setSecuritySessionId] = useState(null);
  const [securityAttemptId, setSecurityAttemptId] = useState(null);
  const [hmacSecret, setHmacSecret] = useState(null);
  const [serverViolationCount, setServerViolationCount] = useState(0);
  const [serverMaxViolationCount, setServerMaxViolationCount] = useState(3);
  const [preCheckData, setPreCheckData] = useState(null);
  
  // Slot availability state
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [slotStatus, setSlotStatus] = useState(null); // 'active', 'scheduled', 'closed'
  const [slotData, setSlotData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const checkAvailability = async () => {
      if (mode === 'result' || completedResult) {
        setAvailabilityLoading(false);
        return;
      }
      try {
        const res = await api.get(`/aptitude/tests/${test._id}/availability`);
        if (!cancelled && res.data && res.data.success) {
          setSlotStatus(res.data.data.status);
          setSlotData(res.data.data);
        }
      } catch (err) {
        console.error('Error checking availability:', err);
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    };
    checkAvailability();
    return () => { cancelled = true; };
  }, [test._id, mode, completedResult]);

  // Countdown clock if scheduled
  const [displaySeconds, setDisplaySeconds] = useState(0);
  useEffect(() => {
    if (slotStatus === 'scheduled' && slotData?.opensInSeconds > 0) {
      setDisplaySeconds(slotData.opensInSeconds);
      const timer = setInterval(() => {
        setDisplaySeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setSlotStatus('active');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [slotStatus, slotData]);

  if (mode === 'result' || completedResult) {
    return <InnerAptitudeTestAttempt test={test} onExit={onExit} mode={mode} preloadedResult={completedResult} violations={securityViolations} />;
  }

  if (availabilityLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading slot information...</div>;
  }

  let subtitle = "This assessment is protected. Please start in full-screen mode to continue.";
  let allowStart = true;
  let customButtonLabel = "Start Assessment";

  if (slotStatus === 'closed') {
    subtitle = "The time slot for this test has closed.";
    allowStart = false;
    customButtonLabel = "Slot Closed";
  } else if (slotStatus === 'scheduled') {
    const mins = Math.floor(displaySeconds / 60);
    const secs = displaySeconds % 60;
    subtitle = `This test is scheduled to open in ${mins}m ${secs}s.`;
    allowStart = false;
    customButtonLabel = "Please Wait";
  } else if (slotStatus === 'cancelled') {
    subtitle = "This test slot has been cancelled.";
    allowStart = false;
    customButtonLabel = "Cancelled";
  }

  return (
    <ExamSecurityWrapper
      active={examActive}
      title={`Aptitude Test: ${test?.title || ''}`}
      subtitle={subtitle}
      assessmentType="aptitude"
      assessmentId={test?._id}
      attemptId={securityAttemptId}
      sessionId={securitySessionId}
      hmacSecret={hmacSecret}
      initialViolationCount={serverViolationCount}
      initialMaxViolationCount={serverMaxViolationCount}
      onStart={(newSessionId, data) => {
        setSecuritySessionId(newSessionId);
        if (data) setPreCheckData(data);
        if (allowStart) setExamActive(true);
      }}
      onViolation={(event, serverResponse) => {
        console.warn('Aptitude violation recorded:', event);
        setSecurityViolations(prev => [...prev, event]);
        if (Number.isFinite(Number(serverResponse?.violationCount))) setServerViolationCount(Number(serverResponse.violationCount));
        if (Number.isFinite(Number(serverResponse?.maxViolationCount))) setServerMaxViolationCount(Number(serverResponse.maxViolationCount));
        if (serverResponse?.autoSubmitted && securityAttemptId) {
          api.get(`/aptitude/attempt/${securityAttemptId}/result`)
            .then(response => response.data?.success && setCompletedResult(response.data.data))
            .catch(error => console.error('Failed to load the auto-submitted result:', error));
        }
      }}
      startButtonLabel={customButtonLabel}
      disabled={!allowStart}
    >
      <InnerAptitudeTestAttempt
        test={test}
        onExit={onExit}
        mode={mode}
        onComplete={setCompletedResult}
        violations={securityViolations}
        sessionId={securitySessionId}
        preCheckData={preCheckData}
        onAttemptInitialized={(data) => {
          setSecurityAttemptId(data.attemptId);
          setHmacSecret(data.hmacSecret);
        }}
        onSecurityState={(count, max) => {
          setServerViolationCount(count);
          setServerMaxViolationCount(max);
        }}
      />
    </ExamSecurityWrapper>
  );
};

export default AptitudeTestAttempt;
