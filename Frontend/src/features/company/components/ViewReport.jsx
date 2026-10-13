import React from 'react';

const ViewReport = ({ candidate, onClose }) => {
  if (!candidate) return null;

  // Handle nested candidate data structure from backend
  const candidateName = candidate.candidate?.name || candidate.name || 'Unknown Candidate';
  const candidateEmail = candidate.candidate?.email || candidate.email || 'No email';
  const status = candidate.status || 'pending';
  const completedAt = candidate.completedAt || candidate.startedAt;
  const duration = candidate.duration || 30; // Default duration

  // Only show summary for company-driven interviews
  const isCompanyInterview = !candidate.interviewCode || !candidate.interviewCode.startsWith('mock-');

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
          {isCompanyInterview && candidate.results && (
            <div style={{
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.2rem',
              display: 'flex',
              gap: '2rem',
              justifyContent: 'center',
              fontWeight: 600
            }}>
              <div>Technical: <span style={{color:'#2563eb'}}>{Math.round((candidate.results.technicalScore || 0) * 10) / 10}/10</span></div>
              <div>Communication: <span style={{color:'#2563eb'}}>{Math.round((candidate.results.communicationScore || 0) * 10) / 10}/10</span></div>
              <div>Problem Solving: <span style={{color:'#2563eb'}}>{Math.round((candidate.results.problemSolvingScore || 0) * 10) / 10}/10</span></div>
              <div>Overall: <span style={{color:'#059669'}}>{Math.round((candidate.results.overallScore || 0) * 10) / 10}/10</span></div>
            </div>
          )}
          <div className="candidate-details">
            <p><strong>Email:</strong> {candidateEmail}</p>
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Completed:</strong> {completedAt ? new Date(completedAt).toLocaleString() : 'N/A'}</p>
            <p><strong>Duration:</strong> {duration} minutes</p>
          </div>
        </div>
      </div>
      <div className="modal-overlay" onClick={onClose}></div>
    </div>
  );
};

export default ViewReport; 