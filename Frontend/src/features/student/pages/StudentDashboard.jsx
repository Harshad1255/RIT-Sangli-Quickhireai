import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Home from "../components/Home";
import Interview from "../components/Interview";
import StudentProfile from "../../interview/components/StudentProfile";
import StudentAptitudeTestList from "../components/StudentAptitudeTestList";
import AptitudeTestAttempt from "../components/AptitudeTestAttempt";
import StudentCodingProblemList from "../components/StudentCodingProblemList";
import CodingWorkspace from "../components/CodingWorkspace";

// Scholastic Practice Module Components
import ScholasticDashboard from "../../scholastic/components/ScholasticDashboard";
import AptitudePractice from "../../scholastic/components/AptitudePractice";
import CodingPractice from "../../scholastic/components/CodingPractice";
import ContestsPage from "../../scholastic/components/ContestsPage";
import LeaderboardPage from "../../scholastic/components/LeaderboardPage";
import ProgressPage from "../../scholastic/components/ProgressPage";
import MockTestsPage from "../../scholastic/components/MockTestsPage";
import BookmarksPage from "../../scholastic/components/BookmarksPage";
import ProfilePage from "../../scholastic/components/ProfilePage";

import "../styles/StudentDashboard.css";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("home");
  const [selectedAptitudeTest, setSelectedAptitudeTest] = useState(null);
  const [aptitudeMode, setAptitudeMode] = useState("take");
  const [selectedCodingProblem, setSelectedCodingProblem] = useState(null);

  const handleAptitudeTestSelection = (test, mode) => {
    if (!test || !test._id) {
      console.error('Invalid aptitude test selected:', test);
      return;
    }
    setSelectedAptitudeTest(test);
    setAptitudeMode(mode || 'take');
  };

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <Home />;
      case "interviews":
        return <Interview />;
      case "profile":
        return <StudentProfile />;
      case "assigned-aptitude":
        if (selectedAptitudeTest && selectedAptitudeTest._id) {
          return (
            <AptitudeTestAttempt
              test={selectedAptitudeTest}
              mode={aptitudeMode}
              onExit={() => {
                setSelectedAptitudeTest(null);
              }}
            />
          );
        }
        return (
          <StudentAptitudeTestList
            onSelectTest={handleAptitudeTestSelection}
          />
        );
      case "coding-platform":
        if (selectedCodingProblem) {
          return (
            <CodingWorkspace
              problem={selectedCodingProblem}
              onExit={() => {
                setSelectedCodingProblem(null);
              }}
            />
          );
        }
        return (
          <StudentCodingProblemList
            onSelectProblem={(prob) => setSelectedCodingProblem(prob)}
          />
        );
      // Scholastic Practice Cases
      case "scholastic-dashboard":
        return <ScholasticDashboard setActiveSection={setActiveSection} />;
      case "scholastic-aptitude":
        return <AptitudePractice />;
      case "scholastic-coding":
        return <CodingPractice />;
      case "scholastic-contests":
        return <ContestsPage />;
      case "scholastic-leaderboard":
        return <LeaderboardPage />;
      case "scholastic-progress":
        return <ProgressPage />;
      case "scholastic-mocktests":
        return <MockTestsPage setActiveSection={setActiveSection} />;
      case "scholastic-bookmarks":
        return <BookmarksPage setActiveSection={setActiveSection} />;
      case "scholastic-profile":
        return <ProfilePage />;
      default:
        return <Home />;
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when section changes
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
  };

  const isAssessmentActive = Boolean(selectedAptitudeTest || selectedCodingProblem);

  if (isAssessmentActive) {
    return (
      <div className="dashboard-container assessment-active">
        <main className="main-content full-width-assessment">
          {selectedAptitudeTest && selectedAptitudeTest._id ? (
            <AptitudeTestAttempt
              test={selectedAptitudeTest}
              mode={aptitudeMode}
              onExit={() => {
                setSelectedAptitudeTest(null);
              }}
            />
          ) : (
            <CodingWorkspace
              problem={selectedCodingProblem}
              onExit={() => {
                setSelectedCodingProblem(null);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Header with Hamburger Menu */}
      <div className="mobile-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/rit-logo.png" alt="RIT Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.1rem', color: '#3b82f6', margin: 0 }}>QuickHire AI</h2>
        </div>
        <button 
          className="hamburger-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#1e293b', cursor: 'pointer' }}
        >
          <i className="fas fa-bars"></i>
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}

      <div className={`sidebar-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
        <Sidebar 
          setActiveSection={handleSectionChange} 
          activeSection={activeSection}
          navigate={navigate}
        />
        {/* Close button inside sidebar for mobile */}
        <button 
          className="close-sidebar-btn"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'absolute',
            top: '1.2rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#64748b',
            cursor: 'pointer',
            zIndex: 101,
            display: 'none'
          }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <main className="main-content">
        {renderContent()}
      </main>

      <style>{`
        @media (min-width: 1025px) {
          .mobile-header { display: none !important; }
          .sidebar-overlay { display: none !important; }
          .sidebar-wrapper { display: contents; }
        }
        @media (max-width: 1024px) {
          .sidebar-wrapper .sidebar { transform: translateX(-100%); }
          .sidebar-wrapper.open .sidebar { transform: translateX(0); }
          .sidebar-wrapper.open .close-sidebar-btn { display: block !important; }
          .main-content { margin-left: 0 !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard; 