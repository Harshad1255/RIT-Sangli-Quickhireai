import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import LandingPage from './features/auth/pages/LandingPage';
import LoginPage from './features/auth/pages/LoginPage';
import SignupPage from './features/auth/pages/SignupPage';
import StudentDashboard from './features/student/pages/StudentDashboard';
import InterviewSession from './features/interview/pages/InterviewSession';
import InterviewScreen from './features/interview/components/InterviewScreen';
import InterviewGuidelines from './features/interview/components/InterviewGuidelines';
import SkillsSelection from './features/interview/components/SkillsSelection';
import CompanyDashboard from './features/company/pages/CompanyDashboard';
import { InterviewDetails } from './features/company/pages';
import CompanyHome from './features/company/components/CompanyHome';
import CompanyInterviews from './features/company/components/CompanyInterviews';
import CreateInterview from './features/company/components/CreateInterview';
import CandidateCodingWorkspaceWrapper from './features/student/components/CandidateCodingWorkspaceWrapper';
import UploadCandidates from './features/company/components/UploadCandidates';
import CandidateReports from './features/company/components/CandidateReports';
import CompanyProfile from './features/company/components/CompanyProfile';
import './styles/App.css'; // Create this file for styles
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MockInterviewPage from './features/interview/pages/MockInterviewPage';
import InterviewScreenWrapper from './features/interview/components/InterviewScreenWrapper';
import ScholasticMainPage from './features/scholastic/pages/ScholasticMainPage';
import CompanyAptitudeTests from './features/company/components/CompanyAptitudeTests';
import CompanyCodingProblems from './features/company/components/CompanyCodingProblems';
import CompanyLeaderboard from './features/company/components/CompanyLeaderboard';
import CompanyScholastic from './features/company/pages/CompanyScholastic';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f8fafc;
`;

// --- Auth Guard Utilities ---
function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}
function getUserType() {
  const user = getUser();
  return user?.userType || null;
}
function isLoggedIn() {
  return !!localStorage.getItem('token') && !!getUserType();
}

function PrivateRoute({ children, allowed }) {
  const userType = getUserType();
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (allowed && !allowed.includes(userType)) {
    // If user is logged in but not allowed for this route, redirect to their dashboard
    return <Navigate to={userType === 'company' ? '/company-dashboard' : '/dashboard'} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const userType = getUserType();
  if (isLoggedIn()) {
    return <Navigate to={userType === 'company' ? '/company-dashboard' : '/dashboard'} replace />;
  }
  return children;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoggedIn() && (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup')) {
      const userType = getUserType();
      navigate(userType === 'company' ? '/company-dashboard' : '/dashboard', { replace: true });
    }
    // Prevent company from accessing student dashboard and vice versa
    if (isLoggedIn()) {
      const userType = getUserType();
      if (userType === 'company' && location.pathname.startsWith('/dashboard')) {
        navigate('/company-dashboard', { replace: true });
      }
      if (userType === 'student' && location.pathname.startsWith('/company-dashboard')) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location]);

  return (
    <AppContainer>
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        } />
        <Route path="/dashboard" element={
          <PrivateRoute allowed={['student']}>
            <StudentDashboard />
          </PrivateRoute>
        } />
        <Route path="/dashboard/scholastic/*" element={
          <PrivateRoute allowed={['student']}>
            <ScholasticMainPage />
          </PrivateRoute>
        } />
        <Route path="/candidate/test/:testId/coding/:problemId" element={
          <PrivateRoute allowed={['student']}>
            {/* Needs a component to wrap CodingWorkspace with proctoring */}
            <CandidateCodingWorkspaceWrapper />
          </PrivateRoute>
        } />
        <Route path="/company-dashboard/*" element={
          <PrivateRoute allowed={['company']}>
            <CompanyDashboard />
          </PrivateRoute>
        } >
          <Route index element={<CompanyHome />} />
          <Route path="interviews" element={<CompanyInterviews />} />
          <Route path="create-interview" element={<CreateInterview />} />
          <Route path="interviews/:interviewId/upload-candidates" element={<UploadCandidates />} />
          <Route path="reports" element={<CandidateReports />} />
          <Route path="profile" element={<CompanyProfile />} />
          <Route path="aptitude-tests" element={<CompanyAptitudeTests />} />
          <Route path="coding-problems" element={<CompanyCodingProblems />} />
          <Route path="scholastic/*" element={<CompanyScholastic />} />
          <Route path="leaderboard" element={<CompanyLeaderboard />} />
          <Route path="settings" element={<div>Settings Page</div>} />
          <Route path="team" element={<div>Team Management Page</div>} />
          <Route path="interviews/:id/details" element={<InterviewDetails />} />
        </Route>
        <Route path="/interview" element={<Outlet />}> {/* Nested interview routes */}
          <Route path="mock" element={
            <PrivateRoute allowed={['student']}>
              <MockInterviewPage />
            </PrivateRoute>
          } />
          <Route path="mock/session/:mockCode" element={
            <PrivateRoute allowed={['student']}>
              <InterviewScreenWrapper />
            </PrivateRoute>
          } />
          <Route path="guidelines/:interviewCode" element={
            <PrivateRoute allowed={['student']}>
              <InterviewGuidelines />
            </PrivateRoute>
          } />
          <Route path="skills/:interviewCode" element={
            <PrivateRoute allowed={['student']}>
              <SkillsSelection />
            </PrivateRoute>
          } />
          <Route path="session/:interviewCode" element={
            <PrivateRoute allowed={['student']}>
              <InterviewSession />
            </PrivateRoute>
          } />
          <Route path="screen/:interviewCode" element={
            <PrivateRoute allowed={['student']}>
              <InterviewScreen />
            </PrivateRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppContainer>
  );
}

export default App; 