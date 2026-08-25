import React, { useState } from 'react';
import '../styles/MockTestsPage.css';

const MockTestsPage = ({ setActiveSection }) => {
  const [activeTest, setActiveTest] = useState(null);
  const [testSubmitted, setTestSubmitted] = useState(false);

  const mockTests = [
    {
      id: 'tcs-nqt',
      company: 'TCS NQT',
      title: 'TCS National Qualifier Test Mock 2026',
      description: 'Full-length placement simulation covering Quantitative Aptitude, Logical Reasoning, Verbal, and 2 Coding rounds.',
      duration: '120 Min',
      questions: '45 MCQs + 2 Coding',
      difficulty: 'Medium',
      icon: 'fa-building'
    },
    {
      id: 'infosys',
      company: 'Infosys',
      title: 'Infosys Specialist Programmer Mock Test',
      description: 'Advanced algorithmic problem solving and pseudo-code evaluation tailored for Infosys Specialist roles.',
      duration: '90 Min',
      questions: '30 MCQs + 3 Coding',
      difficulty: 'Hard',
      icon: 'fa-laptop-code'
    },
    {
      id: 'wipro',
      company: 'Wipro',
      title: 'Wipro Elite NLTH Placement Mock',
      description: 'Comprehensive aptitude & essay writing plus coding test simulation.',
      duration: '100 Min',
      questions: '40 MCQs + 1 Coding',
      difficulty: 'Medium',
      icon: 'fa-briefcase'
    },
    {
      id: 'google',
      company: 'Google',
      title: 'Google SWE Intern Coding Assessment',
      description: 'Simulated online coding round with 2 hard algorithmic problems (Dynamic Programming & Graph Traversal).',
      duration: '90 Min',
      questions: '2 Advanced Coding',
      difficulty: 'Hard',
      icon: 'fa-google'
    },
    {
      id: 'amazon',
      company: 'Amazon',
      title: 'Amazon SDE-1 Online Assessment Mock',
      description: 'Focuses on Trees, Graphs, Sliding Window, and Leadership Principles MCQ scenarios.',
      duration: '105 Min',
      questions: '20 MCQs + 2 Coding',
      difficulty: 'Hard',
      icon: 'fa-amazon'
    },
    {
      id: 'accenture',
      company: 'Accenture',
      title: 'Accenture Cognitive & Technical Assessment',
      description: 'Covers English Ability, Analytical Reasoning, Numerical Ability, and Common Applications.',
      duration: '90 Min',
      questions: '50 MCQs + 2 Coding',
      difficulty: 'Easy',
      icon: 'fa-cogs'
    }
  ];

  return (
    <div className="mocktests-page">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
          Company Mock Placement Tests
        </h2>
        <p style={{ color: '#64748b', margin: 0 }}>
          Simulate real online placement assessments with company-specific question patterns and timed environments.
        </p>
      </div>

      <div className="mocktests-grid">
        {mockTests.map((mock) => (
          <div key={mock.id} className="mocktest-card">
            <div>
              <div className="company-badge">
                <div className="company-logo-circle">
                  <i className={`fab ${mock.icon.startsWith('fa-') ? '' : mock.icon} fas ${mock.icon}`}></i>
                </div>
                <div>
                  <h4>{mock.company}</h4>
                  <span>{mock.title}</span>
                </div>
              </div>

              <p>{mock.description}</p>

              <div className="mock-details-box">
                <div className="mock-details-col">
                  <strong>{mock.duration}</strong>
                  <span>Duration</span>
                </div>
                <div className="mock-details-col">
                  <strong>{mock.questions}</strong>
                  <span>Format</span>
                </div>
                <div className="mock-details-col">
                  <strong style={{ color: mock.difficulty === 'Hard' ? '#ef4444' : mock.difficulty === 'Medium' ? '#f59e0b' : '#10b981' }}>
                    {mock.difficulty}
                  </strong>
                  <span>Level</span>
                </div>
              </div>
            </div>

            <button
              className="start-mock-btn"
              onClick={() => setActiveSection('scholastic-coding')}
            >
              <span>Start Mock Assessment</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MockTestsPage;
