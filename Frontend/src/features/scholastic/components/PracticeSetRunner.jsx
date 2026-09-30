import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import scholasticApi from '../services/scholasticApi';
import ExamSecurityWrapper from '../../../shared/components/assessment/ExamSecurityWrapper';
import '../styles/AptitudePractice.css';

import { getApiBaseUrl } from '../../../config/api';

const API_BASE = `${getApiBaseUrl()}/aptitude`;

const PracticeSetRunner = () => {
  const { id } = useParams(); // /dashboard/scholastic/practice-sets/:id
  const navigate = useNavigate();
  
  const [practiceSet, setPracticeSet] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOptionId }
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [examActive, setExamActive] = useState(false);
  const [securityViolations, setSecurityViolations] = useState([]);
  
  useEffect(() => {
    initPracticeSet();
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitPracticeSet(true); // Auto submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const initPracticeSet = async () => {
    try {
      const token = localStorage.getItem('token');
      // 1. Fetch practice set (which has hidden answers)
      const res = await axios.get(`${API_BASE}/practice-sets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPracticeSet(res.data.practiceSet);
      
      // 2. Start attempt
      const attemptRes = await axios.post(`${API_BASE}/practice-sets/${id}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttemptId(attemptRes.data.attempt._id);

      if (res.data.practiceSet.timeLimitMinutes > 0) {
        setTimeLeft(res.data.practiceSet.timeLimitMinutes * 60);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load practice set.');
      navigate('/dashboard/scholastic/aptitude');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qId, optId) => {
    setAnswers(prev => ({ ...prev, [qId]: optId }));
    if (attemptId) {
      scholasticApi.savePracticeSetAnswer(attemptId, {
        questionId: qId,
        selectedOptionId: optId
      }).catch(err => console.error('Error saving practice answer:', err));
    }
  };

  const submitPracticeSet = async (automatic = false) => {
    if (!attemptId || submitting) return;
    if (!automatic && !window.confirm('Are you sure you want to submit this practice?')) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formattedAnswers = Object.entries(answers).map(([qId, optId]) => ({
        questionId: qId,
        selectedOptionId: optId
      }));

      const timeTaken = practiceSet.timeLimitMinutes > 0 ? (practiceSet.timeLimitMinutes * 60) - timeLeft : 0;

      await axios.post(`${API_BASE}/attempts/${attemptId}/submit`, {
        answers: formattedAnswers,
        timeTakenSeconds: timeTaken,
        violations: securityViolations
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigate(`/dashboard/scholastic/practice-sets/result/${attemptId}`);
    } catch (err) {
      console.error(err);
      alert('Error submitting practice set');
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Practice Set...</div>;
  if (!practiceSet || practiceSet.questions.length === 0) return <div style={{ padding: '50px', textAlign: 'center' }}>Practice set is empty.</div>;

  const currentQ = practiceSet.questions[currentQIndex];

  return (
    <ExamSecurityWrapper
      active={examActive}
      title={practiceSet?.title || 'Practice Set'}
      subtitle="Stay focused while you complete this timed skill check."
      assessmentType="practice"
      assessmentId={practiceSet?._id}
      attemptId={attemptId}
      startButtonLabel="Start Practice Set"
      requireFullscreen={false}
      onStart={() => setExamActive(true)}
      onViolation={(event) => {
        setSecurityViolations(prev => [...prev, event]);
      }}
    >
      <div className="practice-runner-shell">
        <div className="practice-topbar">
          <div>
            <h2>{practiceSet.title}</h2>
            <span>Question {currentQIndex + 1} of {practiceSet.questions.length}</span>
          </div>
          {timeLeft !== null && (
            <div className={`practice-timer ${timeLeft < 60 ? 'danger' : ''}`}>
              <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          )}
        </div>

        <div className="practice-card">
          <h3>{currentQ.questionText}</h3>
          
          {currentQ.questionImageUrl && (
            <div className="question-visual" style={{ margin: '15px 0' }}>
              <img src={`${API_BASE.replace('/api/aptitude', '')}${currentQ.questionImageUrl}`} alt="Question visual" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px' }} />
            </div>
          )}

          <div className="practice-options">
            {currentQ.options.map(opt => (
              <div
                key={opt.id}
                onClick={() => handleOptionSelect(currentQ._id, opt.id)}
                className={`practice-option ${answers[currentQ._id] === opt.id ? 'selected' : ''}`}
              >
                {opt.text}
              </div>
            ))}
          </div>
        </div>

        <div className="practice-actions">
          <button
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQIndex === 0}
            className="nav-button secondary"
          >
            Previous
          </button>

          {currentQIndex < practiceSet.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQIndex(prev => prev + 1)}
              className="nav-button primary"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={submitPracticeSet}
              disabled={submitting}
              className="nav-button success"
            >
              {submitting ? 'Submitting...' : 'Submit Final Practice Set'}
            </button>
          )}
        </div>

        <div className="practice-navigator">
          <h4>Navigator</h4>
          <div className="navigator-grid">
            {practiceSet.questions.map((q, idx) => (
              <button
                key={q._id}
                onClick={() => setCurrentQIndex(idx)}
                className={`navigator-button ${currentQIndex === idx ? 'active' : ''} ${answers[q._id] ? 'answered' : ''}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ExamSecurityWrapper>
  );
};

export default PracticeSetRunner;
