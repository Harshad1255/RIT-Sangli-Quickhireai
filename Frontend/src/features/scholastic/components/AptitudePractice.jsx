import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import '../styles/AptitudePractice.css';

const AptitudePractice = () => {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState(['All', 'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Active question modal state
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, selectedDifficulty]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await scholasticApi.getAptitudeQuestions({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty,
        search: searchQuery || undefined,
        limit: 50
      });
      if (res.data && res.data.questions) {
        setQuestions(res.data.questions);
      }
    } catch (err) {
      console.error('Error loading aptitude questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  const openQuestionModal = (q) => {
    setActiveQuestion(q);
    setSelectedOption(null);
    setSubmitted(false);
    setSubmitResult(null);
  };

  const closeQuestionModal = () => {
    setActiveQuestion(null);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !activeQuestion || submitting) return;
    setSubmitting(true);
    try {
      const res = await scholasticApi.submitAptitudeAnswer({
        questionId: activeQuestion._id,
        selectedOptionId: selectedOption,
        timeTakenSeconds: 30
      });

      if (res.data && res.data.success) {
        setSubmitted(true);
        setSubmitResult(res.data);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="aptitude-practice">
      <div className="aptitude-header">
        <div>
          <h2>Aptitude Practice Bank</h2>
          <p>Solve curated quantitative, reasoning, and verbal aptitude questions with instant detailed explanations.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="category-chips">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              className={`cat-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="search-box">
            <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
            <input
              type="text"
              placeholder="Search topics, questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
      </div>

      {/* Questions Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p style={{ marginTop: '1rem' }}>Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <i className="fas fa-search fa-2x" style={{ color: '#cbd5e1' }}></i>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>No questions found for the selected filters.</p>
        </div>
      ) : (
        <div className="questions-grid">
          {questions.map((q) => (
            <div
              key={q._id}
              className="apt-question-card"
              onClick={() => openQuestionModal(q)}
            >
              <div>
                <div className="card-top">
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}>{q.category}</span>
                  <span className={`diff-badge ${q.difficulty}`}>{q.difficulty}</span>
                </div>
                <h4>{q.title}</h4>
                <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0.5rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {q.questionText}
                </p>
              </div>
              <div className="card-meta">
                <span><i className="fas fa-check-circle" style={{ marginRight: '4px', color: '#10b981' }}></i> {q.accuracy || 75}% Accuracy</span>
                <span><i className="fas fa-users" style={{ marginRight: '4px' }}></i> {q.totalAttempts || 0} Attempts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Solving Modal */}
      {activeQuestion && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') closeQuestionModal(); }}>
          <div className="apt-modal-content">
            <button className="close-btn" onClick={closeQuestionModal}>
              <i className="fas fa-times"></i>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className={`diff-badge ${activeQuestion.difficulty}`}>{activeQuestion.difficulty}</span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{activeQuestion.category}</span>
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
              {activeQuestion.title}
            </h3>

            <p style={{ fontSize: '1.05rem', color: '#334155', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
              {activeQuestion.questionText}
            </p>

            <div className="option-list">
              {activeQuestion.options && activeQuestion.options.map((opt) => {
                let btnClass = "option-btn";
                if (!submitted) {
                  if (selectedOption === opt.id) btnClass += " selected";
                } else {
                  btnClass += " disabled";
                  if (submitResult && opt.id === submitResult.correctOptionId) {
                    btnClass += " correct";
                  } else if (selectedOption === opt.id && opt.id !== submitResult?.correctOptionId) {
                    btnClass += " wrong";
                  }
                }

                return (
                  <button
                    key={opt.id}
                    className={btnClass}
                    onClick={() => { if (!submitted) setSelectedOption(opt.id); }}
                  >
                    <span>{opt.text}</span>
                    {submitted && submitResult && opt.id === submitResult.correctOptionId && (
                      <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
                    )}
                    {submitted && submitResult && selectedOption === opt.id && opt.id !== submitResult.correctOptionId && (
                      <i className="fas fa-times-circle" style={{ color: '#ef4444' }}></i>
                    )}
                  </button>
                );
              })}
            </div>

            {!submitted ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  className="solve-btn"
                  style={{ opacity: selectedOption === null ? 0.6 : 1 }}
                  disabled={selectedOption === null || submitting}
                  onClick={handleSubmitAnswer}
                >
                  {submitting ? 'Checking...' : 'Submit Answer'}
                </button>
              </div>
            ) : (
              <div className="explanation-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h5 style={{ color: submitResult?.isCorrect ? '#10b981' : '#ef4444', margin: 0 }}>
                    <i className={`fas fa-${submitResult?.isCorrect ? 'check-circle' : 'times-circle'}`} style={{ marginRight: '6px' }}></i>
                    {submitResult?.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                  </h5>
                  {submitResult?.xpReward && (
                    <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      +{submitResult.xpReward.xpGain} XP Earned
                    </span>
                  )}
                </div>
                <h5>Explanation:</h5>
                <p>{submitResult?.explanation || activeQuestion.explanation || 'The correct option satisfies the mathematical/logical condition.'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AptitudePractice;
