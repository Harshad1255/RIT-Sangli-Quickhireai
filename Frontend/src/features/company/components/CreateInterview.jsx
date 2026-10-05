import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreateInterview.css";
import { api } from '../../../shared/services/api';

const CreateInterview = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    interviewName: "",
    roles: [],
    skills: {},
    difficulty: "medium",
    numQuestions: 5,
    date: "",
    time: "",
    duration: 60,
    description: ""
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableRoles = [
    "Software Development Engineer (SDE)",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "DevOps Engineer",
    "Data Scientist",
    "Machine Learning Engineer",
    "QA Engineer",
    "Product Manager",
    "UI/UX Designer",
    "Mobile Developer",
    "Cloud Engineer"
  ];

  const availableSkills = {
    "Software Development Engineer (SDE)": [
      "Data Structures & Algorithms",
      "Object-Oriented Programming",
      "System Design",
      "Database Management",
      "Operating Systems",
      "Computer Networks",
      "Software Architecture",
      "Problem Solving",
      "Code Optimization",
      "Version Control"
    ],
    "Frontend Developer": [
      "React",
      "JavaScript",
      "TypeScript",
      "HTML/CSS",
      "Redux",
      "Next.js",
      "Vue.js",
      "Angular",
      "Responsive Design",
      "Web Performance",
      "State Management",
      "UI/UX Principles"
    ],
    "Backend Developer": [
      "Node.js",
      "Python",
      "Java",
      "Spring Boot",
      "REST APIs",
      "GraphQL",
      "Microservices",
      "Database Design",
      "API Security",
      "Caching",
      "Message Queues",
      "Serverless Architecture"
    ],
    "Full Stack Developer": [
      "MERN Stack",
      "MEAN Stack",
      "LAMP Stack",
      "Django",
      "Flask",
      "Full Stack Architecture",
      "API Integration",
      "Authentication",
      "Deployment",
      "CI/CD",
      "Cloud Services",
      "Web Security"
    ],
    "DevOps Engineer": [
      "Docker",
      "Kubernetes",
      "AWS",
      "Azure",
      "CI/CD",
      "Infrastructure as Code",
      "Monitoring",
      "Logging",
      "Security",
      "Automation",
      "Cloud Architecture",
      "System Administration"
    ],
    "Data Scientist": [
      "Python",
      "R",
      "Machine Learning",
      "Data Analysis",
      "Statistics",
      "Data Visualization",
      "SQL",
      "Big Data",
      "Deep Learning",
      "Natural Language Processing",
      "Data Mining",
      "Predictive Modeling"
    ],
    "Machine Learning Engineer": [
      "Python",
      "TensorFlow",
      "PyTorch",
      "Deep Learning",
      "Computer Vision",
      "NLP",
      "Model Deployment",
      "MLOps",
      "Feature Engineering",
      "Model Evaluation",
      "Transfer Learning",
      "Reinforcement Learning"
    ],
    "QA Engineer": [
      "Manual Testing",
      "Automation Testing",
      "Selenium",
      "JIRA",
      "Test Cases",
      "Performance Testing",
      "Security Testing",
      "API Testing",
      "Mobile Testing",
      "Test Automation",
      "Quality Assurance",
      "Bug Tracking"
    ],
    "Product Manager": [
      "Product Strategy",
      "Market Research",
      "User Stories",
      "Agile Methodologies",
      "Product Roadmap",
      "Stakeholder Management",
      "Data Analysis",
      "User Experience",
      "Product Metrics",
      "Competitive Analysis",
      "Product Launch",
      "Customer Feedback"
    ],
    "UI/UX Designer": [
      "Figma",
      "Adobe XD",
      "User Research",
      "Wireframing",
      "Prototyping",
      "User Testing",
      "Design Systems",
      "Accessibility",
      "Interaction Design",
      "Visual Design",
      "Information Architecture",
      "Design Thinking"
    ],
    "Mobile Developer": [
      "React Native",
      "Flutter",
      "iOS Development",
      "Android Development",
      "Mobile UI/UX",
      "Mobile Security",
      "Performance Optimization",
      "Push Notifications",
      "Mobile Testing",
      "App Store Guidelines",
      "Cross-Platform Development",
      "Mobile Architecture"
    ],
    "Cloud Engineer": [
      "AWS",
      "Azure",
      "Google Cloud",
      "Cloud Architecture",
      "Serverless Computing",
      "Containerization",
      "Cloud Security",
      "Infrastructure as Code",
      "Cloud Monitoring",
      "Cost Optimization",
      "Multi-Cloud Strategy",
      "Cloud Migration"
    ]
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    if (role && !formData.roles.includes(role)) {
      setFormData(prev => ({
        ...prev,
        roles: [...prev.roles, role],
        skills: {
          ...prev.skills,
          [role]: []
        }
      }));
    }
  };

  const handleSkillChange = (role, skill) => {
    setFormData(prev => {
      const currentSkills = prev.skills[role] || [];
      const updatedSkills = currentSkills.includes(skill)
        ? currentSkills.filter(s => s !== skill)
        : [...currentSkills, skill];
      
      return {
        ...prev,
        skills: {
          ...prev.skills,
          [role]: updatedSkills
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate form data
      if (!formData.interviewName.trim()) {
        throw new Error("Interview name is required");
      }
      if (formData.roles.length === 0) {
        throw new Error("At least one role must be selected");
      }
      if (!formData.date || !formData.time) {
        throw new Error("Date and time are required");
      }

      // Prepare data for API
      const allSkills = Object.values(formData.skills).flat();
      const interviewData = {
        title: formData.interviewName,
        description: formData.description,
        roles: formData.roles,
        skills: allSkills,
        difficulty: formData.difficulty,
        numQuestions: formData.numQuestions,
        scheduledDate: `${formData.date}T${formData.time}`,
        duration: formData.duration
      };

      const response = await api.post("/interviews", interviewData);
      
      if (response.data.success) {
        navigate(`/company-dashboard/interviews/${response.data.interview._id}/upload-candidates`);
      } else {
        throw new Error(response.data.error || "Failed to create interview");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep1 = () => (
    <div className="form-step">
      <h3>Basic Information</h3>
      <div className="form-group">
        <label>Interview Name *</label>
        <input
          type="text"
          name="interviewName"
          value={formData.interviewName}
          onChange={handleInputChange}
          placeholder="Enter interview name"
          required
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe the interview purpose and requirements"
          rows="4"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Difficulty Level</label>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleInputChange}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="form-group">
          <label>Number of Questions</label>
          <select
            name="numQuestions"
            value={formData.numQuestions}
            onChange={handleInputChange}
          >
            <option value={3}>3 Questions</option>
            <option value={5}>5 Questions</option>
            <option value={7}>7 Questions</option>
            <option value={10}>10 Questions</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h3>Roles & Skills</h3>
      <div className="form-group">
        <label>Select Roles *</label>
        <select onChange={handleRoleChange} value="">
          <option value="">Choose a role...</option>
          {availableRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <div className="selected-roles">
          {formData.roles.map(role => (
            <span key={role} className="role-tag">
              {role}
              <button
                type="button"
                aria-label={`Remove ${role}`}
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    roles: prev.roles.filter(r => r !== role),
                    skills: Object.fromEntries(
                      Object.entries(prev.skills).filter(([r]) => r !== role)
                    )
                  }));
                }}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      </div>
      
      {formData.roles.map(role => (
        <div key={role} className="skills-section">
          <h4>{role} Skills</h4>
          <div className="skills-grid">
            {availableSkills[role]?.map(skill => (
              <label key={skill} className="skill-checkbox">
                <input
                  type="checkbox"
                  checked={formData.skills[role]?.includes(skill) || false}
                  onChange={() => handleSkillChange(role, skill)}
                />
                <span>{skill}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h3>Schedule Interview</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        <div className="form-group">
          <label>Time *</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      <div className="form-group">
        <label>Duration (minutes)</label>
        <select
          name="duration"
          value={formData.duration}
          onChange={handleInputChange}
        >
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
          <option value={90}>90 minutes</option>
          <option value={120}>120 minutes</option>
        </select>
      </div>
    </div>
  );

  return (
    <div style={{minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 0'}}>
      <div style={{maxWidth: 800, width: '100%', background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(30,41,59,0.10)', border: '1.5px solid #e0e7ef', padding: '2.5rem 2.5rem', margin: '0 auto'}}>
        <h1 style={{fontWeight: 900, fontSize: '2rem', color: '#1e293b', marginBottom: '0.5rem', letterSpacing: '-1px', textAlign: 'center'}}>Create New Interview</h1>
        <p style={{color: '#64748b', fontWeight: 500, fontSize: '1.1rem', marginBottom: '2rem', textAlign: 'center'}}>Set up a new interview session for your candidates. Fill in the details below to get started.</p>
        {/* Stepper */}
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '1.5rem'}}>
          {[1,2,3].map(n => (
            <div key={n} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div style={{width: 38, height: 38, borderRadius: '50%', background: step === n ? '#2563eb' : '#e0e7ef', color: step === n ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', marginBottom: 6, border: step === n ? '3px solid #2563eb' : '3px solid #e0e7ef', transition: 'all 0.2s'}}>{n}</div>
              <span style={{fontSize: '0.95rem', color: step === n ? '#2563eb' : '#64748b', fontWeight: step === n ? 700 : 500}}>{n === 1 ? 'Basic' : n === 2 ? 'Roles' : 'Schedule'}</span>
            </div>
          ))}
        </div>
        {/* Form Steps */}
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div style={{marginBottom: '2rem'}}>{renderStep1()}</div>
          )}
          {step === 2 && (
            <div style={{marginBottom: '2rem'}}>{renderStep2()}</div>
          )}
          {step === 3 && (
            <div style={{marginBottom: '2rem'}}>{renderStep3()}</div>
          )}
          {error && <div style={{color: 'red', marginBottom: '1rem', textAlign: 'center'}}>{error}</div>}
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem'}}>
            {step > 1 && (
              <button type="button" onClick={prevStep} style={{padding: '0.9rem 2.2rem', borderRadius: '10px', background: '#f1f5f9', color: '#1e293b', fontWeight: 700, border: 'none', fontSize: '1.05rem', boxShadow: '0 2px 8px rgba(30,41,59,0.06)'}}>Back</button>
            )}
            {step < 3 && (
              <button type="button" onClick={nextStep} style={{padding: '0.9rem 2.2rem', borderRadius: '10px', background: '#2563eb', color: 'white', fontWeight: 700, border: 'none', fontSize: '1.05rem', boxShadow: '0 2px 8px rgba(37,99,235,0.10)'}}>Next</button>
            )}
            {step === 3 && (
              <button type="submit" style={{padding: '0.9rem 2.2rem', borderRadius: '10px', background: '#2563eb', color: 'white', fontWeight: 700, border: 'none', fontSize: '1.05rem', boxShadow: '0 2px 8px rgba(37,99,235,0.10)'}} disabled={loading}>
                {loading ? 'Creating...' : 'Create Interview'}
              </button>
            )}
          </div>
        </form>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .create-interview-card { max-width: 98vw !important; padding: 1.2rem !important; }
        }
        @media (max-width: 600px) {
          .create-interview-card { max-width: 99vw !important; padding: 0.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default CreateInterview; 