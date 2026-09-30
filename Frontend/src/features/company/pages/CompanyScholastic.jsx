import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ScholasticQuestionBank from '../components/ScholasticQuestionBank';
import ScholasticPracticeSets from '../components/ScholasticPracticeSets';
import ScholasticDailyDSA from '../components/ScholasticDailyDSA';
import CreateScholasticQuestion from '../components/CreateScholasticQuestion';
import axios from 'axios';
import { getApiBaseUrl } from '../../../config/api.js';
import '../styles/CompanyScholastic.css';

const CompanyScholastic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analytics, setAnalytics] = useState({
    totalPracticeSets: 0,
    publishedSets: 0,
    totalQuestions: 0,
    publishedQuestions: 0,
    draftQuestions: 0,
    totalAttempts: 0,
    averageAccuracy: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [location.pathname]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${getApiBaseUrl()}/scholastic/company/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics', err);
    }
  };

  const currentTab = location.pathname.includes('practice-sets') ? 'sets' : location.pathname.includes('daily-dsa') ? 'daily' : 'questions';

  return (
    <div className="company-scholastic-container">
      <div className="company-scholastic-header">
        <div>
          <p className="scholastic-kicker">Scholastic Studio</p>
          <h2>Publish student-ready aptitude practice</h2>
        </div>
        <p className="scholastic-subtitle">Create questions and practice sets. Students only see content after it is published by the company.</p>
      </div>

      <div className="scholastic-analytics-grid">
        <div className="analytics-card">
          <div className="analytics-icon blue"><i className="fas fa-layer-group"></i></div>
          <div className="analytics-info">
            <h3>{analytics.publishedSets}</h3>
            <p>Published Sets</p>
          </div>
        </div>
        <div className="analytics-card">
          <div className="analytics-icon purple"><i className="fas fa-question-circle"></i></div>
          <div className="analytics-info">
            <h3>{analytics.publishedQuestions}</h3>
            <p>Published Questions</p>
          </div>
        </div>
        <div className="analytics-card">
          <div className="analytics-icon green"><i className="fas fa-user-graduate"></i></div>
          <div className="analytics-info">
            <h3>{analytics.totalAttempts}</h3>
            <p>Student Attempts</p>
          </div>
        </div>
      </div>

      <div className="scholastic-publish-note">
        <i className="fas fa-eye"></i>
        <span>Only published content is visible in the student scholastic experience.</span>
      </div>

      <div className="scholastic-tabs">
        <button 
          className={currentTab === 'questions' ? 'active' : ''} 
          onClick={() => navigate('/company-dashboard/scholastic')}
        >
          <i className="fas fa-database"></i> Question Bank
        </button>
        <button 
          className={currentTab === 'sets' ? 'active' : ''} 
          onClick={() => navigate('/company-dashboard/scholastic/practice-sets')}
        >
          <i className="fas fa-book-open"></i> Practice Sets
        </button>
        <button 
          className={currentTab === 'daily' ? 'active' : ''} 
          onClick={() => navigate('/company-dashboard/scholastic/daily-dsa')}
        >
          <i className="fas fa-calendar-day"></i> Daily DSA
        </button>
      </div>

      <div className="scholastic-content-area">
        <Routes>
          <Route path="/" element={<ScholasticQuestionBank />} />
          <Route path="/create-question" element={<CreateScholasticQuestion />} />
          <Route path="/edit-question/:id" element={<CreateScholasticQuestion />} />
          <Route path="/practice-sets" element={<ScholasticPracticeSets />} />
          <Route path="/daily-dsa" element={<ScholasticDailyDSA />} />
        </Routes>
      </div>
    </div>
  );
};

export default CompanyScholastic;
