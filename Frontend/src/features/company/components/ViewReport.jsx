import React from 'react';

const ViewReport = ({ candidate, onClose }) => {
  if (!candidate) return null;

  const candidateName = candidate.candidate?.name || candidate.name || 'Unknown Candidate';
  const candidateEmail = candidate.candidate?.email || candidate.email || 'No email';
  const status = candidate.status || 'pending';
  const completedAt = candidate.completedAt || candidate.startedAt;
  const duration = candidate.duration || 30; // Default duration
  const results = candidate.results || {};
  const answers = results.answers || [];

  return (
    <div className="report-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{candidateName} - Report</h2>
          <button onClick={onClose} className="close-button">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="candidate-details">
            <p><strong>Email:</strong> {candidateEmail}</p>
            <p><strong>Interview:</strong> {candidate.interviewName || candidate.title || 'Interview'}</p>
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Completed:</strong> {completedAt ? new Date(completedAt).toLocaleString() : 'N/A'}</p>
            <p><strong>Duration:</strong> {duration} minutes</p>
          </div>
          {candidate.results && (
            <>
              <section aria-label="Interview score summary" style={{background:'#f1f5f9',borderRadius:10,padding:'1rem',margin:'1.2rem 0',display:'flex',flexWrap:'wrap',gap:'1rem 2rem',fontWeight:600}}>
                <div>Evaluation: <strong>{results.evaluationStatus || 'Status not recorded'}</strong></div>
                <div>Marks: {results.marksObtained ?? 'N/A'}/{results.totalMarks ?? 'N/A'} ({results.percentage ?? 'N/A'}%)</div>
                <div>Attempted: {results.attemptedQuestions ?? 'N/A'}/{results.totalQuestions ?? answers.length}</div>
                <div>Technical Knowledge: {results.technicalKnowledge ?? results.technicalScore ?? 'N/A'}/10</div>
                <div>Coding Ability: {results.codingAbility ?? 'N/A'}/10</div>
                <div>Communication Skills: {results.communicationSkills ?? results.communicationScore ?? 'N/A'}/10</div>
                <div>Problem Solving: {results.problemSolving ?? results.problemSolvingScore ?? 'N/A'}/10</div>
                <div>Overall: {results.overallScore == null ? 'N/A' : `${Number(results.overallScore).toFixed(1)}/10`}</div>
              </section>
              {results.feedback && <p><strong>Overall Summary:</strong> {results.feedback}</p>}
              {results.strengths?.length > 0 && <section><h3>Strengths</h3><ul>{results.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
              {results.weaknesses?.length > 0 && <section><h3>Areas for Improvement</h3><ul>{results.weaknesses.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
              {answers.length > 0 && (
                <section aria-label="Question by question results">
                  <h3>Question-by-Question Results</h3>
                  {answers.map((answer, index) => (
                    <article key={answer.questionId || index} style={{borderTop:'1px solid #e2e8f0',padding:'1rem 0'}}>
                      <h4>Question {index + 1}</h4>
                      <p><strong>Question:</strong> {answer.question || 'Question text unavailable'}</p>
                      <p><strong>Answer:</strong> {answer.answer || answer.code || 'No answer provided'}</p>
                      <p><strong>Evaluation:</strong> {answer.evaluationSource || 'unknown'}{answer.status === 'provisional' ? ' (provisional fallback)' : ''} — {answer.status || 'status unavailable'}</p>
                      <p><strong>Marks:</strong> {answer.marksObtained ?? 'N/A'}/{answer.maxMarks ?? 10}</p>
                      <p><strong>Scores:</strong> Technical {answer.technicalKnowledge ?? 'N/A'}/10, Coding {answer.codingAbility ?? 'N/A'}/10, Communication {answer.communicationSkills ?? 'N/A'}/10, Problem solving {answer.problemSolving ?? 'N/A'}/10</p>
                      {answer.feedback && <p><strong>Feedback:</strong> {answer.feedback}</p>}
                      {answer.improvements?.length > 0 && <p><strong>To improve:</strong> {answer.improvements.join('; ')}</p>}
                    </article>
                  ))}
                </section>
              )}
              {results.fallbackQuestions?.length > 0 && (
                <p role="status"><strong>Fallback-scored answers:</strong> {results.fallbackQuestions.join(', ')}. These scores are provisional and are not AI-verified.</p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="modal-overlay" onClick={onClose}></div>
    </div>
  );
};

export default ViewReport; 