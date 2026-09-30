import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CompanyProfile.css';

const CompanyProfile = () => {
  const navigate = useNavigate();
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('User data from localStorage:', user); // Debug log
    
    if (!user || user.userType !== 'company') {
      console.log('No user or wrong user type, redirecting to login');
      navigate('/login');
      return;
    }

    // Ensure all required fields exist
    const formattedData = {
      ...user,
      companyName: user.companyName || 'Not provided',
      email: user.email || 'Not provided',
      industry: user.industry || 'Not provided',
      companySize: user.companySize || 'Not provided',
      createdAt: user.createdAt || new Date().toISOString(),
      lastLogin: user.lastLogin || new Date().toISOString()
    };

    console.log('Formatted company data:', formattedData); // Debug log
    setCompanyData(formattedData);
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  if (loading || !companyData) {
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
        <h2>Company Profile</h2>
        <button className="logout-button" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <div className="profile-info">
            <div className="info-item">
              <i className="fas fa-building"></i>
              <div>
                <h3>Company Name</h3>
                <p>{companyData.companyName}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-envelope"></i>
              <div>
                <h3>Email</h3>
                <p>{companyData.email}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-industry"></i>
              <div>
                <h3>Industry</h3>
                <p>{companyData.industry}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-users"></i>
              <div>
                <h3>Company Size</h3>
                <p>{companyData.companySize}</p>
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
                <p>{new Date(companyData.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fas fa-clock"></i>
              <div>
                <h3>Last Login</h3>
                <p>{new Date(companyData.lastLogin).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile; 