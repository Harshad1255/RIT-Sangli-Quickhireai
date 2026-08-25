import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import CodingIDEModal from './CodingIDEModal';
import '../styles/CodingPractice.css';

const CodingPractice = () => {
  const [problems, setProblems] = useState([]);
  const [topics, setTopics] = useState(['All', 'Arrays & Hashing', 'Two Pointers', 'Dynamic Programming', 'Graphs', 'Trees']);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Active IDE Modal
  const [activeProblem, setActiveProblem] = useState(null);

  useEffect(() => {
    fetchProblems();
  }, [selectedTopic, selectedDifficulty]);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await scholasticApi.getCodingQuestions({
        topic: selectedTopic === 'All' ? undefined : selectedTopic,
        difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty,
        search: searchQuery || undefined,
        limit: 50
      });
      if (res.data && res.data.questions) {
        setProblems(res.data.questions);
      }
    } catch (err) {
      console.error('Error loading coding problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProblems();
  };

  const openIDE = (prob) => {
    setActiveProblem(prob);
  };

  const closeIDE = () => {
    setActiveProblem(null);
  };

  return (
    <div className="coding-practice">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
            Algorithmic Coding Arena
          </h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            Master FAANG-level algorithms, data structures, and placement coding rounds in a sandboxed IDE.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.75rem' }}>
        <div className="category-chips">
          {topics.map((top, idx) => (
            <button
              key={idx}
              className={`cat-chip ${selectedTopic === top ? 'active' : ''}`}
              onClick={() => setSelectedTopic(top)}
            >
              {top}
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
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
      </div>

      {/* Problems Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p style={{ marginTop: '1rem' }}>Loading algorithmic problems...</p>
        </div>
      ) : problems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <i className="fas fa-code fa-2x" style={{ color: '#cbd5e1' }}></i>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>No coding problems found for the selected filters.</p>
        </div>
      ) : (
        <div className="coding-table-container">
          <table className="coding-table">
            <thead>
              <tr>
                <th>Problem Title</th>
                <th>Difficulty</th>
                <th>Topic</th>
                <th>Acceptance Rate</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((prob) => (
                <tr key={prob._id}>
                  <td>
                    <div className="prob-title-row" onClick={() => openIDE(prob)}>
                      <h4>{prob.title}</h4>
                      <div className="prob-tags">
                        {prob.tags && prob.tags.slice(0, 3).map((t, idx) => (
                          <span key={idx} className="prob-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`diff-badge ${prob.difficulty}`}>{prob.difficulty}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{prob.topic}</span>
                  </td>
                  <td className="acceptance-cell">
                    {prob.acceptanceRate || 68.5}%
                  </td>
                  <td>
                    <button className="solve-action-btn" onClick={() => openIDE(prob)}>
                      <span>Solve Problem</span>
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* IDE Modal */}
      {activeProblem && (
        <CodingIDEModal problem={activeProblem} onClose={closeIDE} />
      )}
    </div>
  );
};

export default CodingPractice;
