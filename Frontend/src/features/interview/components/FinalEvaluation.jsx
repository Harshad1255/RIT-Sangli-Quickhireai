import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/FinalEvaluation.css';

const FinalEvaluation = ({ evaluation, answers = [] }) => {
  const navigate = useNavigate();

  const getScoreColor = (score) => {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'needs-improvement';
    return 'poor';
  };

  const score = Math.round((Number(evaluation?.overallScore) || 0) * 10) / 10;
  const percentage = evaluation?.percentage !== undefined 
    ? Math.round(Number(evaluation.percentage)) 
    : Math.round(score * 10);

  // Calculate average confidence score from all answers
  const avgConfidence = answers.length ? (
    answers.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / answers.length
  ) : 0;

  const isFallback = evaluation?.evaluationSource === 'fallback' || evaluation?.evaluationSource === 'rubric';

  return (
    <div className="final-evaluation" style={{ maxWidth: '800px', margin: '2rem auto', background: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(30,41,59,0.10)', padding: '2.5rem 2rem' }}>
      <h2 style={{ fontWeight: 900, fontSize: '2.2rem', color: '#1e293b', marginBottom: '0.5rem', textAlign: 'center' }}>Interview Evaluation</h2>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
        Evaluation Method: <strong style={{ color: '#2563eb' }}>{isFallback ? 'Deterministic Rubric Evaluator (Verified Fallback)' : 'Gemini AI Evaluator'}</strong>
      </p>

      <div className="overall-score-section" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.3rem', color: '#334155', marginBottom: '1.2rem' }}>Overall Performance</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#f59e42', background: '#f8fafc', borderRadius: '50%', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            {score}<span style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 700 }}>/10</span>
          </div>
          <div style={{ color: '#64748b', fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem' }}>
            Overall Percentage: <span style={{ color: '#059669', fontWeight: 800 }}>{percentage}%</span>
          </div>
        </div>
      </div>

      <div className="skill-assessment" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#334155', marginBottom: '1rem' }}>Skill Assessment</h3>
        <div className="skill-scores" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {evaluation?.skillAssessment && typeof evaluation.skillAssessment === 'object' ? (
            Object.entries(evaluation.skillAssessment).map(([skill, sVal]) => {
              const numericScore = Math.round((Number(sVal) || 0) * 10) / 10;
              return (
                <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                  <span style={{ minWidth: 160, textTransform: 'capitalize', color: '#64748b', fontWeight: 600 }}>{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 8, height: 16, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, numericScore * 10)}%`, height: '100%', background: numericScore >= 7 ? '#22c55e' : numericScore >= 4 ? '#f59e42' : '#ef4444', borderRadius: 8, transition: 'width 0.3s' }}></div>
                  </div>
                  <span style={{ minWidth: 40, textAlign: 'right', color: '#64748b', fontWeight: 700 }}>{numericScore}/10</span>
                </div>
              );
            })
          ) : (
            <div>No skill assessment data available.</div>
          )}
        </div>
      </div>

      <div className="question-analysis">
        <h3>Question-by-Question Analysis</h3>
        {answers.map((answer, index) => {
          const qObj = typeof answer.question === 'object' && answer.question !== null ? answer.question : null;
          const qText = qObj ? (qObj.question || qObj.text || '') : String(answer.question || '');
          const topicText = qObj ? (qObj.topic || qObj.skill || 'Technical') : 'Technical';
          const evalObj = answer.evaluation || answer.analysis || {};
          const qScore = Math.round((evalObj.score !== undefined ? evalObj.score : (evalObj.awardedMarks || 0)) * 10) / 10;

          return (
            <div key={index} className="question-review">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h4 style={{ margin: 0 }}>Question {index + 1}</h4>
                <span style={{ 
                  background: qScore >= 7 ? '#dcfce7' : qScore >= 4 ? '#fef3c7' : '#fee2e2', 
                  color: qScore >= 7 ? '#166534' : qScore >= 4 ? '#92400e' : '#991b1b',
                  padding: '4px 12px', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  fontSize: '0.95rem' 
                }}>
                  {qScore} / 10
                </span>
              </div>
              <div className="question-content">
                <p><strong>Topic:</strong> {topicText}</p>
                <p><strong>Question:</strong> {qText}</p>
                <p><strong>Your Answer:</strong> {answer.answer || (answer.code ? '[Code provided below]' : 'No answer provided')}</p>
                {answer.code && (
                  <div className="code-section">
                    <p><strong>Code Provided:</strong></p>
                    <pre>{answer.code}</pre>
                  </div>
                )}
                <div className="question-scores">
                  <div className={`score-item ${getScoreColor(evalObj.technicalKnowledge ?? evalObj.technicalAccuracy ?? qScore)}`}>
                    <span>Technical Knowledge:</span>
                    <span>{Math.round((evalObj.technicalKnowledge ?? evalObj.technicalAccuracy ?? qScore) * 10) / 10}/10</span>
                  </div>
                  <div className={`score-item ${getScoreColor(evalObj.codingAbility ?? qScore)}`}>
                    <span>Coding Ability:</span>
                    <span>{Math.round((evalObj.codingAbility ?? qScore) * 10) / 10}/10</span>
                  </div>
                  <div className={`score-item ${getScoreColor(evalObj.communicationSkills ?? evalObj.communication ?? qScore)}`}>
                    <span>Communication:</span>
                    <span>{Math.round((evalObj.communicationSkills ?? evalObj.communication ?? qScore) * 10) / 10}/10</span>
                  </div>
                  <div className={`score-item ${getScoreColor(evalObj.problemSolving ?? qScore)}`}>
                    <span>Problem Solving:</span>
                    <span>{Math.round((evalObj.problemSolving ?? qScore) * 10) / 10}/10</span>
                  </div>
                </div>
                <div className="question-feedback">
                  <p><strong>Feedback:</strong> {evalObj.feedback || 'Relevant response demonstrating foundational understanding.'}</p>
                  {Array.isArray(evalObj.improvements) && evalObj.improvements.length > 0 && (
                    <div className="improvements">
                      <p><strong>Areas for Improvement:</strong></p>
                      <ul>
                        {evalObj.improvements.map((improvement, i) => (
                          <li key={i}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="final-feedback">
        <h3>Overall Feedback</h3>
        <div className="strengths">
          <h4>Key Strengths</h4>
          <ul>
            {(evaluation?.strengths || []).map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
        <div className="improvements">
          <h4>Areas for Improvement</h4>
          <ul>
            {(evaluation?.areasForImprovement || evaluation?.weaknesses || []).map((area, index) => (
              <li key={index}>{area}</li>
            ))}
          </ul>
        </div>
        <div className="career-readiness">
          <h4>Career Readiness Assessment</h4>
          {evaluation?.careerReadiness ? (
            <>
              <p><strong>Level:</strong> {evaluation.careerReadiness.level}</p>
              <p><strong>Recommendation:</strong> {evaluation.careerReadiness.recommendation}</p>
            </>
          ) : (
            <p>Candidate completed interview successfully.</p>
          )}
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={() => navigate('/dashboard')} className="primary-button">
          Return to Dashboard
        </button>
        <button onClick={() => window.print()} className="secondary-button">
          Download Report
        </button>
      </div>
    </div>
  );
};

export default FinalEvaluation;