import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/FinalEvaluation.css';

const FinalEvaluation = ({ evaluation, answers }) => {
  const navigate = useNavigate();

  const getScoreColor = (score) => {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'needs-improvement';
    return 'poor';
  };

  // Calculate the angle for the conic-gradient ring (score out of 10)
  const score = Number(evaluation.overallScore) || 0;
  const scoreAngle = Math.min(360, (score / 10) * 360);
  const scoreColorClass = getScoreColor(score);

  // Calculate average confidence score from all answers
  const avgConfidence = answers.length ? (
    answers.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / answers.length
  ) : 0;
  const confidenceColorClass = getScoreColor(avgConfidence / 10); // scale to 0-10

  return (
    <div className="final-evaluation" style={{ maxWidth: '800px', margin: '2rem auto', background: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(30,41,59,0.10)', padding: '2.5rem 2rem' }}>
      <h2 style={{ fontWeight: 900, fontSize: '2.2rem', color: '#1e293b', marginBottom: '2rem', textAlign: 'center' }}>Interview Evaluation</h2>
      <div className="overall-score-section" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.3rem', color: '#334155', marginBottom: '1.2rem' }}>Overall Performance</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#f59e42', background: '#f8fafc', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>{score}<span style={{ fontSize: '1.2rem', color: '#d1d5db', fontWeight: 700 }}>/10</span></div>
        </div>
      </div>
      <div className="skill-assessment" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#334155', marginBottom: '1rem' }}>Skill Assessment</h3>
        <div className="skill-scores" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {evaluation.skillAssessment && typeof evaluation.skillAssessment === 'object' ? (
            Object.entries(evaluation.skillAssessment).map(([skill, score]) => (
              <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <span style={{ minWidth: 160, textTransform: 'capitalize', color: '#64748b', fontWeight: 600 }}>{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 8, height: 16, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: `${score * 10}%`, height: '100%', background: score >= 7 ? '#22c55e' : score >= 4 ? '#f59e42' : '#ef4444', borderRadius: 8, transition: 'width 0.3s' }}></div>
                </div>
                <span style={{ minWidth: 40, textAlign: 'right', color: '#64748b', fontWeight: 700 }}>{score}/10</span>
              </div>
            ))
          ) : (
            <div>No skill assessment data available.</div>
          )}
        </div>
      </div>

      <div className="question-analysis">
        <h3>Question-by-Question Analysis</h3>
        {answers.map((answer, index) => (
          <div key={index} className="question-review">
            <h4>Question {index + 1}</h4>
            <div className="question-content">
              <p><strong>Topic:</strong> {answer.question.topic}</p>
              <p><strong>Question:</strong> {answer.question.question}</p>
              <p><strong>Your Answer:</strong> {answer.answer}</p>
              {answer.code && (
                <div className="code-section">
                  <p><strong>Code Provided:</strong></p>
                  <pre>{answer.code}</pre>
                </div>
              )}
              <div className="question-scores">
                {answer.evaluation && answer.evaluation.evaluationFailed ? (
                  <div className="score-item" style={{ color: '#dc2626', fontWeight: 600 }}>
                    <span>Evaluation failed for this answer</span>
                  </div>
                ) : (
                  <>
                    <div className={`score-item ${getScoreColor(answer.evaluation?.technicalKnowledge || answer.evaluation?.technicalAccuracy || 0)}`}>
                      <span>Technical Knowledge:</span>
                      <span>{answer.evaluation?.technicalKnowledge ?? answer.evaluation?.technicalAccuracy ?? 0}/10</span>
                    </div>
                    <div className={`score-item ${getScoreColor(answer.evaluation?.codingAbility || 0)}`}>
                      <span>Coding Ability:</span>
                      <span>{answer.evaluation?.codingAbility || 0}/10</span>
                    </div>
                    <div className={`score-item ${getScoreColor(answer.evaluation?.communicationSkills || answer.evaluation?.communication || 0)}`}>
                      <span>Communication Skills:</span>
                      <span>{answer.evaluation?.communicationSkills ?? answer.evaluation?.communication ?? 0}/10</span>
                    </div>
                    <div className={`score-item ${getScoreColor(answer.evaluation?.problemSolving || 0)}`}>
                      <span>Problem Solving:</span>
                      <span>{answer.evaluation?.problemSolving || 0}/10</span>
                    </div>
                  </>
                )}
              </div>
              <div className="question-feedback">
                <p><strong>Feedback:</strong> {answer.evaluation?.feedback || 'No feedback available'}</p>
                {answer.evaluation?.improvements && answer.evaluation.improvements.length > 0 && (
                  <div className="improvements">
                    <p><strong>Areas for Improvement:</strong></p>
                    <ul>
                      {answer.evaluation.improvements.map((improvement, i) => (
                        <li key={i}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="final-feedback">
        <h3>Overall Feedback</h3>
        <div className="strengths">
          <h4>Key Strengths</h4>
          <ul>
            {(evaluation.strengths || []).map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
        <div className="improvements">
          <h4>Areas for Improvement</h4>
          <ul>
            {(evaluation.areasForImprovement || evaluation.weaknesses || []).map((area, index) => (
              <li key={index}>{area}</li>
            ))}
          </ul>
        </div>
        <div className="career-readiness">
          <h4>Career Readiness Assessment</h4>
          {evaluation.careerReadiness ? (
            <>
              <p><strong>Level:</strong> {evaluation.careerReadiness.level}</p>
              <p><strong>Recommendation:</strong> {evaluation.careerReadiness.recommendation}</p>
            </>
          ) : (
            <p>No career readiness data available.</p>
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