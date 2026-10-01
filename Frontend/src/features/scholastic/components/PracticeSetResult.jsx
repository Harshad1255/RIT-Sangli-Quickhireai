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

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}><i className="fas fa-spinner fa-spin fa-2x" style={{color: '#2563eb'}}></i><p style={{color: '#64748b', marginTop: '10px'}}>Loading Result...</p></div>;
  if (!result) return <div style={{ padding: '50px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}><i className="fas fa-exclamation-triangle fa-2x" style={{color: '#ef4444'}}></i><p style={{color: '#64748b', marginTop: '10px'}}>Result not found.</p></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', color: '#0f172a', margin: '0 0 10px 0' }}>Practice Set Completed!</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>{result.practiceSetId?.title}</p>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#3b82f6', marginBottom: '5px' }}>{result.score}<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/{result.totalQuestions}</span></div>
          <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Score</div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#10b981', marginBottom: '5px' }}>{result.accuracy.toFixed(1)}%</div>
          <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Accuracy</div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#f59e0b', marginBottom: '5px' }}>+{result.xpEarned}</div>
          <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>XP Earned</div>
        </div>
      </div>

      <h3 style={{ color: '#0f172a', fontSize: '1.5rem', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Detailed Review</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {result.practiceSetId.questions.map((q, idx) => {
          const studentAns = result.answers.find(a => a.questionId.toString() === q._id.toString());
          const isCorrect = studentAns?.isCorrect;
          const isUnattempted = !studentAns || studentAns.selectedOptionId === null;
          
          return (
            <div key={q._id} style={{ 
              background: '#fff', 
              borderRadius: '16px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)', 
              border: '1px solid #e2e8f0', 
              borderLeft: `6px solid ${isCorrect ? '#10b981' : isUnattempted ? '#94a3b8' : '#ef4444'}`,
              overflow: 'hidden' 
            }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1e293b', flex: 1, paddingRight: '20px' }}>
                  <span style={{ color: '#64748b', marginRight: '10px' }}>Q{idx + 1}.</span> {q.questionText}
                </div>
                <span style={{ 
                  padding: '6px 14px', 
                  borderRadius: '20px', 
                  fontSize: '0.85rem', 
                  fontWeight: 700,
                  background: isCorrect ? '#dcfce7' : isUnattempted ? '#f1f5f9' : '#fee2e2',
                  color: isCorrect ? '#16a34a' : isUnattempted ? '#64748b' : '#dc2626'
                }}>
                  {isCorrect ? 'Correct' : isUnattempted ? 'Skipped' : 'Incorrect'}
                </span>
              </div>
              
              <div style={{ padding: '20px 24px', background: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {q.options.map(opt => {
                    let bg = '#fff';
                    let border = '1px solid #e2e8f0';
                    
                    if (opt.id === q.correctOptionId) {
                      bg = '#dcfce7';
                      border = '1px solid #22c55e';
                    } else if (studentAns?.selectedOptionId === opt.id) {
                      bg = '#fee2e2';
                      border = '1px solid #ef4444';
                    }

                    return (
                      <div key={opt.id} style={{ padding: '12px 16px', borderRadius: '8px', background: bg, border: border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#334155', fontWeight: (opt.id === q.correctOptionId || studentAns?.selectedOptionId === opt.id) ? 600 : 400 }}>{opt.text}</span>
                        {opt.id === q.correctOptionId && <i className="fas fa-check-circle" style={{ color: '#16a34a', fontSize: '1.2rem' }}></i>}
                        {studentAns?.selectedOptionId === opt.id && opt.id !== q.correctOptionId && <i className="fas fa-times-circle" style={{ color: '#dc2626', fontSize: '1.2rem' }}></i>}
                      </div>
                    );
                  })}
                </div>

                {(q.explanation || !isCorrect) && (
                  <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                    <i className="fas fa-lightbulb" style={{ color: '#f59e0b', fontSize: '1.2rem', marginTop: '2px' }}></i>
                    <div>
                      <h5 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1rem' }}>Explanation</h5>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>{q.explanation || 'The correct answer is highlighted in green above.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <button 
          onClick={() => navigate('/dashboard/scholastic/aptitude')}
          style={{ padding: '12px 30px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1.1rem' }}
        >
          <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i> Back to Scholastic Hub
        </button>
      </div>
    </div>
  );
};

export default PracticeSetResult;
