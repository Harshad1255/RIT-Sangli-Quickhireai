import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { getApiBaseUrl } from '../../../config/api';

const API_BASE = `${getApiBaseUrl()}/aptitude`;

const PracticeSetResult = () => {
  const { id } = useParams(); // attemptId
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/attempts/${id}/result`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data.attempt);
    } catch (err) {
      console.error(err);
      alert('Failed to load result');
      navigate('/dashboard/scholastic/aptitude');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Result...</div>;
  if (!result) return <div style={{ padding: '50px', textAlign: 'center' }}>Result not found.</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '2rem', color: '#1e293b', margin: '0 0 10px 0' }}>Practice Set Completed!</h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', margin: '0 0 30px 0' }}>{result.practiceSetId?.title}</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
          <div style={{ padding: '20px', background: '#eff6ff', borderRadius: '12px', minWidth: '150px' }}>
            <h3 style={{ fontSize: '2.5rem', margin: '0', color: '#2563eb' }}>{result.score}/{result.totalQuestions}</h3>
            <p style={{ margin: '8px 0 0 0', color: '#3b82f6', fontWeight: 600 }}>Score</p>
          </div>
          <div style={{ padding: '20px', background: '#ecfdf5', borderRadius: '12px', minWidth: '150px' }}>
            <h3 style={{ fontSize: '2.5rem', margin: '0', color: '#059669' }}>{result.accuracy.toFixed(1)}%</h3>
            <p style={{ margin: '8px 0 0 0', color: '#10b981', fontWeight: 600 }}>Accuracy</p>
          </div>
          <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '12px', minWidth: '150px' }}>
            <h3 style={{ fontSize: '2.5rem', margin: '0', color: '#d97706' }}>+{result.xpEarned}</h3>
            <p style={{ margin: '8px 0 0 0', color: '#f59e0b', fontWeight: 600 }}>XP Earned</p>
          </div>
        </div>
      </div>

      <h3 style={{ color: '#1e293b', marginBottom: '20px' }}>Detailed Review</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {result.practiceSetId.questions.map((q, idx) => {
          const studentAns = result.answers.find(a => a.questionId.toString() === q._id.toString());
          const isCorrect = studentAns?.isCorrect;
          const isUnattempted = !studentAns || studentAns.selectedOptionId === null;
          
          return (
            <div key={q._id} style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `6px solid ${isCorrect ? '#10b981' : isUnattempted ? '#94a3b8' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{idx + 1}. {q.questionText}</h4>
                <span style={{ 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  background: isCorrect ? '#dcfce7' : isUnattempted ? '#f1f5f9' : '#fee2e2',
                  color: isCorrect ? '#16a34a' : isUnattempted ? '#64748b' : '#dc2626'
                }}>
                  {isCorrect ? 'Correct' : isUnattempted ? 'Skipped' : 'Incorrect'}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {q.options.map(opt => {
                  let bg = '#f8fafc';
                  let border = '1px solid #e2e8f0';
                  
                  if (opt.id === q.correctOptionId) {
                    bg = '#dcfce7';
                    border = '1px solid #10b981';
                  } else if (studentAns?.selectedOptionId === opt.id) {
                    bg = '#fee2e2';
                    border = '1px solid #ef4444';
                  }

                  return (
                    <div key={opt.id} style={{ padding: '12px 16px', background: bg, border, borderRadius: '6px', fontSize: '0.95rem' }}>
                      {opt.text}
                      {opt.id === q.correctOptionId && <i className="fas fa-check-circle" style={{ marginLeft: '10px', color: '#10b981' }}></i>}
                      {studentAns?.selectedOptionId === opt.id && opt.id !== q.correctOptionId && <i className="fas fa-times-circle" style={{ marginLeft: '10px', color: '#ef4444' }}></i>}
                    </div>
                  );
                })}
              </div>

              {(q.explanation || !isCorrect) && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#475569' }}>Explanation</h5>
                  <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>{q.explanation || 'The correct answer is clearly highlighted above.'}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button 
          onClick={() => navigate('/dashboard/scholastic/aptitude')}
          style={{ padding: '12px 30px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}
        >
          Back to Scholastic Hub
        </button>
      </div>
    </div>
  );
};

export default PracticeSetResult;
