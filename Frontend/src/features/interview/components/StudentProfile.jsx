import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StudentProfile.css';

const StudentProfile = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.userType !== 'student') {
      navigate('/login');
      return;
    }

    setStudentData(user);
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  if (loading || !studentData) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Student Profile</h2>
        <button className="logout-button" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <div className="profile-info">
            <div className="info-item">
              <i className="fas fa-user"></i>
              <div>
                <h3>Name</h3>
                <p>{studentData.name || 'Not provided'}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-envelope"></i>
              <div>
                <h3>Email</h3>
                <p>{studentData.email}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-university"></i>
              <div>
                <h3>University</h3>
                <p>{studentData.university || 'Not provided'}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-graduation-cap"></i>
              <div>
                <h3>Graduation Year</h3>
                <p>{studentData.graduationYear || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Account Information</h3>
          <div className="account-info">
            <div className="info-item">
              <i className="fas fa-calendar-plus"></i>
              <div>
                <h3>Member Since</h3>
                <p>{new Date(studentData.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-clock"></i>
              <div>
                <h3>Last Login</h3>
                <p>{new Date(studentData.lastLogin).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile; 