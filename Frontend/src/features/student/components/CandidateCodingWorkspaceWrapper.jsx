import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../shared/services/api';
import CodingWorkspace from './CodingWorkspace';
import ExamSecurityWrapper from '../../../shared/components/assessment/ExamSecurityWrapper';

const CandidateCodingWorkspaceWrapper = () => {
  const { testId, problemId } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examActive, setExamActive] = useState(false);
  const [securityViolations, setSecurityViolations] = useState([]);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await api.get(`/coding/problems/${problemId}`);
        if (res.data && res.data.success) {
          setProblem(res.data.data);
        } else {
          setError('Problem not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch problem');
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [problemId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading coding environment...</div>;
  if (error) return <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>{error}</div>;

  return (
    <ExamSecurityWrapper
      active={examActive}
      title={`Coding Assessment: ${problem?.title || ''}`}
      subtitle="This coding assessment is protected. Please start in full-screen mode before writing code."
      assessmentType="coding"
      assessmentId={problem?._id}
      onStart={() => setExamActive(true)}
      onViolation={(event) => {
        console.warn('Coding violation recorded:', event);
        setSecurityViolations(prev => [...prev, event]);
      }}
      startButtonLabel="Start Coding Assessment"
    >
      <CodingWorkspace 
        problem={problem}
        testId={testId}
        violations={securityViolations}
        onExit={() => {
          window.close();
          navigate(-1);
        }} 
      />
    </ExamSecurityWrapper>
  );
};

export default CandidateCodingWorkspaceWrapper;
