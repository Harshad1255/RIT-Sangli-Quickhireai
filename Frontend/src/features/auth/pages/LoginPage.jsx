import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css"; // Import the CSS file
import { login } from "../services/authApi";
import { getHealthcheckUrl } from "../../../config/api";

const LoginPage = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("student"); // Default: Student
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Clear any existing tokens
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const response = await login({
        email, 
        password,
        userType
      });

      const data = response.data;

      if (!data.token) {
        throw new Error("No authentication token received");
      }

      // Verify user type matches
      if (data.user?.userType !== userType) {
        throw new Error(`Please login as a ${data.user?.userType || 'correct user type'}`);
      }

      // Store user data and token in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      // Store refresh token if provided
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Navigate based on user type
      if (userType === "student") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/company-dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || err.message);
      // Clear any partial data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  };

  const handleWakeBackend = async () => {
    const healthcheckUrl = getHealthcheckUrl();
    window.open(healthcheckUrl, "_blank");
    await wakeBackend();
  };

  return (
    <div className="page-container">
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
        <div className="login-wrapper">
          <div className="left-section">
            <div className="ai-animation">
              <div className="pulse-circle"></div>
              <i className="fas fa-robot"></i>
            </div>
            <h1>Welcome to QuickHire AI</h1>
            <p>Experience the future of interviewing with AI-powered assessments</p>
          </div>

          <div className="right-section">
            <div className="login-form-container">
              <h2>
                <i className="fas fa-user-circle"></i>
                Login to Your Account
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

              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <button 
                  type="submit" 
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login <i className="fas fa-arrow-right"></i>
                    </>
                  )}
                </button>
              </form>

              <p className="signup-text">
                Don't have an account?{" "}
                <span onClick={() => navigate("/signup")}>Sign Up</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage; 