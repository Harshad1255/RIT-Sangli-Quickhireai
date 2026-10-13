import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../shared/services/api";
import ViewReport from "../components/ViewReport";
import "../styles/CandidateReports.css";

const InterviewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    fetchInterview();
    // eslint-disable-next-line
  }, [id]);

  const fetchInterview = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/interviews/${id}`);
      console.log('API response:', response);
      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to fetch interview");
      }
      setInterview(response.data.interview);
    } catch (err) {
      console.error('API error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleCloseReport = () => {
    setSelectedCandidate(null);
  };

  if (loading) return <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div>;
  if (error) return <div style={{padding: '2rem', color: 'red', textAlign: 'center'}}>{error}</div>;
  if (!interview) return <div style={{padding: '2rem', color: '#64748b', textAlign: 'center'}}>Interview not found.</div>;

  return (
    <div style={{maxWidth: 900, margin: '2.5rem auto', background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(30,41,59,0.10)', padding: '2.5rem 2rem'}}>
      {/* Interview Code Display */}
      <div style={{marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '1.2rem'}}>
        <span style={{fontWeight: 700, color: '#2563eb', fontSize: '1.1rem'}}>Interview Code:</span>
        <code style={{background: '#e0e7ef', borderRadius: '8px', padding: '0.35rem 1.1rem', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '1px', color: '#1e293b'}}>{interview.interviewCode || 'N/A'}</code>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap'}}>
        <div style={{flex: 1, minWidth: 0}}>
          <h1 style={{fontWeight: 900, fontSize: '2.1rem', color: '#1e293b', marginBottom: '0.5rem', letterSpacing: '-1px'}}>{interview.title || interview.interviewName || 'Untitled Interview'}</h1>
          <p style={{color: '#64748b', fontWeight: 500, fontSize: '1.1rem', marginBottom: '1.2rem'}}>{interview.description || 'No description provided.'}</p>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem'}}>
            {(interview.skills || []).map((skill, idx) => (
              <span key={idx} style={{background: '#e0f2fe', color: '#0f172a', borderRadius: '8px', padding: '0.3rem 0.9rem', fontWeight: 600, fontSize: '0.93rem'}}>{skill}</span>
            ))}
          </div>
          <div style={{display: 'flex', gap: '1.1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.2rem'}}>
            <span style={{color: '#64748b', fontWeight: 500}}><i className="far fa-calendar"></i> {interview.createdAt ? new Date(interview.createdAt).toLocaleDateString() : 'N/A'}</span>
            <span style={{color: '#64748b', fontWeight: 500}}><i className="far fa-clock"></i> {interview.duration ? `${interview.duration} min` : 'N/A'}</span>
            <span style={{padding: '0.3rem 1rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.93rem', background: interview.status === 'active' ? '#dcfce7' : interview.status === 'draft' ? '#fef9c3' : interview.status === 'completed' ? '#dbeafe' : '#f1f5f9', color: interview.status === 'active' ? '#166534' : interview.status === 'draft' ? '#92400e' : interview.status === 'completed' ? '#1e40af' : '#64748b', textTransform: 'capitalize'}}>{interview.status || 'N/A'}</span>
            <span style={{color: '#64748b', fontWeight: 600, fontSize: '1rem'}}><i className="fas fa-users"></i> {interview.candidates?.length ?? 0} Candidates</span>
          </div>
        </div>
        <button onClick={() => navigate(-1)} style={{padding: '0.7rem 2rem', borderRadius: '10px', background: '#2563eb', color: 'white', fontWeight: 700, border: 'none', fontSize: '1.05rem', boxShadow: '0 2px 8px rgba(37,99,235,0.10)', whiteSpace: 'nowrap', alignSelf: 'flex-start'}}>Back</button>
      </div>
      <div style={{marginTop: '2.5rem'}}>
        <h2 style={{fontWeight: 800, fontSize: '1.3rem', color: '#1e293b', marginBottom: '1.2rem'}}>Candidates ({interview.candidates?.length ?? 0})</h2>
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {(interview.candidates || []).map((candidate, idx) => {
            const candidateName = candidate.candidate?.name || candidate.name || candidate.candidateName || `Candidate ${idx + 1}`;
            const candidateEmail = candidate.candidate?.email || candidate.email || candidate.candidateEmail || 'No email';
            const status = candidate.status || 'pending';
            const code = candidate.code || 'N/A';
            return (
              <div key={candidate.code || idx} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '10px', padding: '1rem 1.5rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1.2rem'}}>
                  <div style={{background: '#2563eb', color: 'white', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem'}}>{candidateName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}</div>
                  <div>
                    <div style={{fontWeight: 700, color: '#1e293b', fontSize: '1.05rem'}}>{candidateName}</div>
                    <div style={{color: '#64748b', fontSize: '0.97rem'}}>{candidateEmail}</div>
                    <div style={{color: '#334155', fontSize: '0.97rem', marginTop: '0.2rem'}}><strong>Code:</strong> <code style={{background: '#e0e7ef', borderRadius: '6px', padding: '0.2rem 0.6rem', fontWeight: 700, fontSize: '1.05rem'}}>{code}</code></div>
                  </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '1.2rem'}}>
                  <span style={{padding: '0.4rem 1.1rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.95rem', background: status === 'completed' ? '#dbeafe' : '#fef9c3', color: status === 'completed' ? '#1e40af' : '#92400e', textTransform: 'capitalize'}}>{status}</span>
                  {status === 'completed' && (
                    <button 
                      onClick={() => handleViewReport(candidate)}
                      style={{padding: '0.6rem 1.3rem', borderRadius: '8px', background: '#2563eb', color: 'white', fontWeight: 700, border: 'none', fontSize: '1rem', boxShadow: '0 2px 8px rgba(37,99,235,0.10)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}
                    >
                      <i className="fas fa-chart-bar"></i> View Report
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Report Modal */}
      {selectedCandidate && (
        <ViewReport 
          candidate={selectedCandidate} 
          onClose={handleCloseReport} 
        />
      )}
    </div>
  );
};

export default InterviewDetails; 