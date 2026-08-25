import { useNavigate, useLocation } from "react-router-dom";
import "../styles/CompanySidebar.css";

const CompanySidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  // Helper to check if a route is active
  const isActive = (path) => {
    if (path === "/company-dashboard") {
      return location.pathname === "/company-dashboard" || location.pathname === "/company-dashboard/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/rit-logo.png" alt="RIT Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>QuickHire AI</h2>
        </div>
      </div>

      <div className="nav-menu">
        <div className="menu-section">
          <span className="section-title">MENU</span>
          <ul>
            <li
              className={isActive("/company-dashboard") ? "active" : ""}
              onClick={() => navigate("/company-dashboard")}
            >
              <div className="menu-item">
                <i className="fas fa-home"></i>
                <span>Dashboard</span>
              </div>
            </li>
            <li
              className={isActive("/company-dashboard/interviews") ? "active" : ""}
              onClick={() => navigate("/company-dashboard/interviews")}
            >
              <div className="menu-item">
                <i className="fas fa-calendar-alt"></i>
                <span>All Interviews</span>
              </div>
            </li>
            <li
              className={isActive("/company-dashboard/create-interview") ? "active" : ""}
              onClick={() => navigate("/company-dashboard/create-interview")}
            >
              <div className="menu-item">
                <i className="fas fa-plus-circle"></i>
                <span>Create Interview</span>
              </div>
            </li>
            <li
              className={isActive("/company-dashboard/aptitude-tests") ? "active" : ""}
              onClick={() => navigate("/company-dashboard/aptitude-tests")}
            >
              <div className="menu-item">
                <i className="fas fa-file-alt"></i>
                <span>Aptitude Tests</span>
              </div>
            </li>
            <li
              className={isActive("/company-dashboard/coding-problems") ? "active" : ""}
              onClick={() => navigate("/company-dashboard/coding-problems")}
            >
              <div className="menu-item">
                <i className="fas fa-code"></i>
                <span>Coding Practice</span>
              </div>
            </li>
            <li
              className={isActive("/company-dashboard/leaderboard") ? "active" : ""}
              onClick={() => navigate("/company-dashboard/leaderboard")}
            >
              <div className="menu-item">
                <i className="fas fa-trophy"></i>
                <span>Leaderboard</span>
              </div>
            </li>
            <li
              className={isActive("/company-dashboard/profile") ? "active" : ""}
              onClick={() => navigate("/company-dashboard/profile")}
            >
              <div className="menu-item">
                <i className="fas fa-user"></i>
                <span>Profile</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <button onClick={handleLogout} className="logout-btn">
        <i className="fas fa-sign-out-alt"></i>
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default CompanySidebar; 