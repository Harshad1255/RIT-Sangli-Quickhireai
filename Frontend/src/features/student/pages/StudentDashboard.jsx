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

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <Home />;
      case "interviews":
        return <Interview />;
      case "profile":
        return <StudentProfile />;
      case "assigned-aptitude":
        if (selectedAptitudeTest) {
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
            onSelectTest={(test, mode) => {
              setSelectedAptitudeTest(test);
              setAptitudeMode(mode);
            }}
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

  return (
    <div className="dashboard-container">
      <Sidebar 
        setActiveSection={setActiveSection} 
        activeSection={activeSection}
        navigate={navigate}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default StudentDashboard; 