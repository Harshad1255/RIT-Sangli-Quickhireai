import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css"; // Import the CSS file
import { login } from "../services/authApi";

const LoginPage = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("refreshToken");

      const response = await login({
        email,
        password,
        userType
      });

      const data = response.data;

      if (!data.token) {
        throw new Error("No authentication token received");
      }

      if (data.user?.userType !== userType) {
        throw new Error(`Please login as a ${data.user?.userType || 'correct user type'}`);
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      if (userType === "student") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/company-dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || err.message || "Login failed. Please try again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("refreshToken");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
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
                  autoComplete="email"
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
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
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
    </div>
  );
};

export default LoginPage; 