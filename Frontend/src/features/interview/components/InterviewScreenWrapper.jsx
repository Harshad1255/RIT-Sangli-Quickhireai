import { useParams, useLocation } from 'react-router-dom';
import InterviewScreen from './InterviewScreen';

const InterviewScreenWrapper = () => {
  const { mockCode } = useParams();
  const location = useLocation();
  const selectedSkills = location.state?.selectedSkills || [];
  const branch = location.state?.branch || sessionStorage.getItem('selectedBranch') || '';

  return (
    <InterviewScreen
      interviewCode={mockCode}
      selectedSkills={selectedSkills}
      branch={branch}
      isMock={true}
    />
  );
};

export default InterviewScreenWrapper; 