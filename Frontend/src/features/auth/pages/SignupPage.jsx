import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SignupPage.css";
import { register } from "../services/authApi";
import { getHealthcheckUrl } from "../../../config/api";

const SignupPage = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("student");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    // Student specific fields
    name: "",
    university: "",
    graduationYear: "",
    // Company specific fields
    companyName: "",
    industry: "",
    companySize: "",
  });
  const [error, setError] = useState("");

  // Backend wake-up logic
  const [backendOnline, setBackendOnline] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const pollInterval = useRef(null);

  const checkBackend = async () => {
    try {
      const res = await fetch(getHealthcheckUrl(), { cache: "no-store" });
      if (res.ok) {
        setBackendOnline(true);
        setCheckingBackend(false);
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
        return true;
      }

      setBackendOnline(false);
      setCheckingBackend(false);
      return false;
    } catch (err) {
      setBackendOnline(false);
      setCheckingBackend(false);
      return false;
    }
  };

  const wakeBackend = async () => {
    setCheckingBackend(true);
    const online = await checkBackend();

    if (!online && !pollInterval.current) {
      pollInterval.current = setInterval(checkBackend, 2000);
    }
  };

  useEffect(() => {
    checkBackend().then((online) => {
      if (!online && !pollInterval.current) {
        pollInterval.current = setInterval(checkBackend, 2000);
      }
    });
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await register({
        email: formData.email,
        password: formData.password,
        userType: userType,
        ...(userType === "student"
          ? {
              name: formData.name,
              university: formData.university,
              graduationYear: formData.graduationYear,
            }
          : {
              companyName: formData.companyName,
              industry: formData.industry,
              companySize: formData.companySize,
            }),
      });

      // Redirect to login page after successful registration
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleWakeBackend = async () => {
    const healthcheckUrl = getHealthcheckUrl();
    window.open(healthcheckUrl, "_blank");
    await wakeBackend();
  };

  return (
    <div className="signup-container">
      {!backendOnline ? (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <p>
            Backend is sleeping. Click below to turn on the server.<br/>
            It may take 30-60 seconds to wake up.(Using free tier of Render)<br/>
            <b>Click the button below to wake up the backend and when backend is ready, you will see navigation button.</b>
          </p>
          <button onClick={handleWakeBackend}>
            Turn On Backend
          </button>
        </div>
      ) : (
        <div className="signup-wrapper">
          <div className="left-section">
            <div className="ai-animation">
              <div className="pulse-circle"></div>
              <i className="fas fa-robot"></i>
            </div>
            <h1>Join QuickHire AI</h1>
            <p>Create your account and start your journey with AI-powered interviews</p>
          </div>

          <div className="right-section">
            <div className="signup-form-container">
              <h2>
                <i className="fas fa-user-plus"></i>
                Create Your Account
              </h2>

              <div className="toggle-buttons">
                <button
                  className={userType === "student" ? "active" : ""}
                  onClick={() => setUserType("student")}
                >
                  <i className="fas fa-user-graduate"></i>
                  Student
                </button>
                <button
                  className={userType === "company" ? "active" : ""}
                  onClick={() => setUserType("company")}
                >
                  <i className="fas fa-building"></i>
                  Company
                </button>
              </div>

              {error && <div className="error-message">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    name="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>

                {userType === "student" ? (
                  <>
                    <div className="input-group">
                      <i className="fas fa-user"></i>
                      <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <i className="fas fa-university"></i>
                      <input
                        type="text"
                        name="university"
                        placeholder="University"
                        value={formData.university}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <i className="fas fa-calendar"></i>
                      <input
                        type="number"
                        name="graduationYear"
                        placeholder="Expected Graduation Year"
                        value={formData.graduationYear}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="input-group">
                      <i className="fas fa-building"></i>
                      <input
                        type="text"
                        name="companyName"
                        placeholder="Company Name"
                        value={formData.companyName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <i className="fas fa-industry"></i>
                      <input
                        type="text"
                        name="industry"
                        placeholder="Industry"
                        value={formData.industry}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <i className="fas fa-users"></i>
                      <select
                        name="companySize"
                        value={formData.companySize}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Company Size</option>
                        <option value="1-50">1-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="501-1000">501-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>
                  </>
                )}

                <button type="submit" className="signup-button">
                  <i className="fas fa-user-plus"></i>
                  Create Account
                </button>
              </form>

              <p className="login-text">
                Already have an account?{" "}
                <span onClick={() => navigate("/login")}>Login</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignupPage; 