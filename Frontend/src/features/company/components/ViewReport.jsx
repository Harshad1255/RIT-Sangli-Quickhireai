import React from 'react';

const ViewReport = ({ candidate, onClose }) => {
  if (!candidate) return null;

  const candidateName = candidate.candidate?.name || candidate.name || 'Candidate';
  const candidateEmail = candidate.candidate?.email || candidate.email || 'No email';
  const status = candidate.status || 'completed';
  const completedAt = candidate.completedAt || candidate.startedAt;
  const duration = candidate.duration || 30;

  const results = candidate.results;
  const overallScore = Math.round((results?.overallScore || 0) * 10) / 10;
  const percentage = results?.percentage !== undefined 
    ? Math.round(Number(results.percentage)) 
    : Math.round(overallScore * 10);

  const sourceLabel = results?.evaluationSource === 'fallback' || results?.evaluationSource === 'rubric'
    ? 'Deterministic Rubric Evaluator (Verified Fallback)'
    : 'Gemini AI Evaluator';

  return (
    <div className="report-modal">
      <div className="modal-content" style={{ maxWidth: 850, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b' }}>{candidateName} - Interview Report</h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Evaluation Source: <strong style={{ color: '#2563eb' }}>{sourceLabel}</strong></span>
          </div>
          <button onClick={onClose} className="close-button" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body" style={{ marginTop: '1.5rem' }}>
          {/* Top Score Badges */}
          {results && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.2rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              justifyContent: 'space-around',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Technical</div>
                <div style={{ fontSize: '1.4rem', color: '#2563eb', fontWeight: 800 }}>{Math.round((results.technicalScore || 0) * 10) / 10} / 10</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Communication</div>
                <div style={{ fontSize: '1.4rem', color: '#2563eb', fontWeight: 800 }}>{Math.round((results.communicationScore || 0) * 10) / 10} / 10</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Problem Solving</div>
                <div style={{ fontSize: '1.4rem', color: '#2563eb', fontWeight: 800 }}>{Math.round((results.problemSolvingScore || 0) * 10) / 10} / 10</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Overall Score</div>
                <div style={{ fontSize: '1.4rem', color: '#059669', fontWeight: 800 }}>{overallScore} / 10 ({percentage}%)</div>
              </div>
            </div>
          )}

          {/* Candidate Metadata */}
          <div className="candidate-details" style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0.3rem 0' }}><strong>Email:</strong> {candidateEmail}</p>
            <p style={{ margin: '0.3rem 0' }}><strong>Status:</strong> <span style={{ textTransform: 'capitalize', color: status === 'completed' ? '#166534' : '#92400e', fontWeight: 700 }}>{status}</span></p>
            <p style={{ margin: '0.3rem 0' }}><strong>Completed:</strong> {completedAt ? new Date(completedAt).toLocaleString() : 'Recently'}</p>
            <p style={{ margin: '0.3rem 0' }}><strong>Duration:</strong> {duration} minutes</p>
          </div>

          {/* Feedback & Observations */}
          {results?.feedback && (
            <div style={{ marginBottom: '1.5rem', background: '#eff6ff', borderRadius: '8px', padding: '1rem', borderLeft: '4px solid #2563eb' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>Executive Feedback</h4>
              <p style={{ margin: 0, color: '#1e293b', fontSize: '0.98rem' }}>{results.feedback}</p>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {results?.strengths && results.strengths.length > 0 && (
              <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '1rem', border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>Key Strengths</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#166534', fontSize: '0.92rem' }}>
                  {results.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {results?.weaknesses && results.weaknesses.length > 0 && (
              <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '1rem', border: '1px solid #fecaca' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>Areas for Improvement</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#991b1b', fontSize: '0.92rem' }}>
                  {results.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Question-by-Question Analysis */}
          {results?.answers && results.answers.length > 0 && (
            <div>
              <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', color: '#1e293b' }}>Question-by-Question Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {results.answers.map((ans, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', borderRadius: '8px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#2563eb' }}>Question {idx + 1}</strong>
                      <span style={{ fontWeight: 800, color: (ans.score || 0) >= 7 ? '#166534' : ((ans.score || 0) >= 4 ? '#92400e' : '#dc2626') }}>
                        {ans.score !== undefined ? ans.score : 0} / 10
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.4rem' }}>{ans.question}</div>
                    <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.4rem' }}>
                      <em>Answer:</em> {ans.answer || (ans.code ? '[Code submitted]' : 'No answer provided')}
                    </div>
                    {ans.code && (
                      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
                        {ans.code}
                      </pre>
                    )}
                    <div style={{ fontSize: '0.88rem', color: '#334155', marginTop: '0.4rem' }}>
                      <strong>Feedback:</strong> {ans.feedback || 'Attempt recorded.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="modal-overlay" onClick={onClose}></div>
    </div>
  );
};

export default ViewReport;