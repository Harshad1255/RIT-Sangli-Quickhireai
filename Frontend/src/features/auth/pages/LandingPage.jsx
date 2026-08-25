import { useNavigate } from "react-router-dom";
import { useContext } from 'react';
import landingImg from '../../../images/landing1.png';
// If you have a UserContext, import it:
// import { UserContext } from '../../context/UserContext';
import '../styles/landing.css';

// Example fallback if you don't have context yet
const getUserName = (props) => {
  // If using context, replace with: const user = useContext(UserContext);
  // return user?.name || 'User';
  return props?.userName || 'User';
};

const LandingPage = (props) => {
  const navigate = useNavigate();
  const userName = getUserName(props);

  return (
    <div className="landing-page">
      {/* Header Section */}
      <header>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/rit-logo.png" alt="RIT Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <span className="gradient-text" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>KES's RIT - QuickHire AI</span>
        </div>
        <nav>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#testimonials">Testimonials</a>
          <div className="auth-buttons">
            <button onClick={() => navigate("/login")} className="login-button">Login</button>
            <button onClick={() => navigate("/signup")} className="signup-button">Sign Up</button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>KES's RIT Placement & AI Interview Platform</h1>
          <p>QuickHire AI streamlines your recruitment process with smart, unbiased, and efficient AI-driven interviews. Save time, reduce bias, and hire the best talent with confidence.</p>
          <div className="hero-buttons">
            <button className="cta-button" onClick={() => navigate('/signup')}>Get Started</button>
            <button className="cta-button" onClick={() => navigate('/login')}>See Demo</button>
          </div>
        </div>
        <div className="hero-image">
          <img src={landingImg} alt="QuickHire AI" />
        </div>
        <div className="scroll-indicator">
          <i className="fas fa-angle-down"></i>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <h2>How QuickHire AI Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Sign Up & Set Up</h3>
            <p>Create your account and set up your company or student profile in minutes.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Customize Interviews</h3>
            <p>Choose skills, add questions, and tailor interviews to your needs.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>AI-Powered Evaluation</h3>
            <p>Let our AI analyze responses, code, and soft skills in real time.</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Get Actionable Reports</h3>
            <p>Receive detailed feedback and reports to make the best hiring decisions.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2>Advanced AI Features</h2>
        <div className="features-grid">
          <div className="feature-box">
            <i className="fas fa-brain"></i>
            <h3>Dynamic Question Generation</h3>
            <p>AI generates role-specific questions and adapts based on candidate responses</p>
          </div>
          <div className="feature-box">
            <i className="fas fa-chart-line"></i>
            <h3>Performance Analytics</h3>
            <p>Comprehensive analysis of communication, confidence, and technical skills</p>
          </div>
          <div className="feature-box">
            <i className="fas fa-face-smile"></i>
            <h3>Behavioral Analysis</h3>
            <p>Advanced facial expression and body language analysis during interviews</p>
          </div>
          <div className="feature-box">
            <i className="fas fa-clock"></i>
            <h3>24/7 Availability</h3>
            <p>Conduct interviews anytime, anywhere with automated scheduling</p>
          </div>
          <div className="feature-box">
            <i className="fas fa-shield-alt"></i>
            <h3>Bias Prevention</h3>
            <p>AI-powered objective evaluation to ensure fair assessment</p>
          </div>
          <div className="feature-box">
            <i className="fas fa-file-alt"></i>
            <h3>Detailed Reports</h3>
            <p>Get comprehensive candidate evaluation reports and rankings</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <h2>What Our Clients Say</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <img src={landingImg} alt="HR Manager" className="client-image" />
            <p>"QuickHire AI has revolutionized our hiring process. We've reduced time-to-hire by 60% while finding better candidates."</p>
            <h4>Sarah Johnson</h4>
            <p className="client-position">HR Manager, Tech Corp</p>
          </div>
          <div className="testimonial-card">
            <img src={landingImg} alt="CEO" className="client-image" />
            <p>"The AI analysis provides insights we couldn't get from traditional interviews. It's been a game-changer for our recruitment."</p>
            <h4>Michael Chen</h4>
            <p className="client-position">CEO, StartUp Inc</p>
          </div>
        </div>
      </section>

      {/* Integration Partners */}
      <section className="partners">
        <h2>Trusted By Leading Companies</h2>
        <div className="partners-grid">
          {/* Add partner logos here */}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <h2>Ready to transform your hiring or interview experience?</h2>
        <p>Join QuickHire AI today and experience the future of smart, efficient, and fair interviews.</p>
        <button className="cta-button" onClick={() => navigate('/signup')}>Get Started</button>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-content">
          <div className="footer-section">
            <h3>QuickHire AI</h3>
            <p>AI-powered interview platform for modern recruitment</p>
            <div className="social-icons">
              <a href="#"><i className="fab fa-linkedin"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-facebook"></i></a>
              <a href="#"><i className="fab fa-youtube"></i></a>
            </div>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/enterprise">Enterprise</a>
            <a href="/demo">Request Demo</a>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <a href="/blog">Blog</a>
            <a href="/guides">Guides</a>
            <a href="/documentation">Documentation</a>
            <a href="/api">API</a>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <a href="/about">About Us</a>
            <a href="/careers">Careers</a>
            <a href="/contact">Contact</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 QuickHire AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 