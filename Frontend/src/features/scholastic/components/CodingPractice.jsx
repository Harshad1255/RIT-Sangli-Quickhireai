import { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';
import CodingIDEModal from './CodingIDEModal';
import '../styles/CodingPractice.css';

const CodingPractice = () => {
  const [problems, setProblems] = useState([]);
  const [topics, setTopics] = useState(['All']);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDailyOnly, setShowDailyOnly] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  // Active IDE Modal
  const [activeProblem, setActiveProblem] = useState(null);
  const [openingProblem, setOpeningProblem] = useState(false);

  useEffect(() => {
    let active = true;
    scholasticApi.getCodingTopics()
      .then(res => {
        if (active && Array.isArray(res.data?.data)) setTopics(res.data.data);
      })
      .catch(err => console.error('Error loading coding topics:', err));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    try {
      scholasticApi.getCodingQuestions({
        topic: selectedTopic === 'All' ? undefined : selectedTopic,
        difficulty: selectedDifficulty === 'All' ? undefined : selectedDifficulty,
        search: debouncedSearchQuery || undefined,
        dailyOnly: showDailyOnly || undefined,
        limit: 50
      }).then(res => {
        if (active) setProblems(res.data?.data || []);
      }).catch(err => {
        if (!active) return;
        console.error('Error loading coding problems:', err);
        setProblems([]);
        setError(err.response?.data?.error || err.message || 'Unable to load coding problems.');
      }).finally(() => {
        if (active) setLoading(false);
      });
    } catch (err) {
      setError(err.message || 'Unable to load coding problems.');
      setLoading(false);
    }

    return () => { active = false; };
  }, [selectedTopic, selectedDifficulty, showDailyOnly, debouncedSearchQuery, refreshVersion]);

  useEffect(() => {
    const refresh = () => setRefreshVersion(version => version + 1);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const interval = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const openIDE = async (prob) => {
    setOpeningProblem(true);
    try {
      const res = await scholasticApi.getCodingQuestionById(prob._id);
      setActiveProblem(res.data?.data || prob);
    } catch (err) {
      console.error('Error loading coding problem:', err);
      alert(err.response?.data?.error || err.message || 'Unable to load coding problem');
    } finally {
      setOpeningProblem(false);
    }
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
            {showDailyOnly
              ? 'Today\'s verified DSA drills curated by the company for daily practice.'
              : 'Master FAANG-level algorithms, data structures, and placement coding rounds in a sandboxed IDE.'}
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
          <button
            type="button"
            onClick={() => setShowDailyOnly(prev => !prev)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1px solid #dbeafe',
              background: showDailyOnly ? '#dbeafe' : '#f8fafc',
              color: showDailyOnly ? '#1d4ed8' : '#334155',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-calendar-day" style={{ marginRight: '0.35rem' }}></i>
            {showDailyOnly ? 'Showing Daily DSA' : 'Daily DSA'}
          </button>

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
          <p style={{ marginTop: '1rem', color: '#64748b' }}>{error || 'No coding problems found for the selected filters.'}</p>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{prob.category || 'Uncategorized'}</span>
                      {prob.tags?.length > 0 && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{prob.tags.join(', ')}</span>}
                    </div>
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
      {openingProblem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', background: 'rgba(15, 23, 42, 0.35)', color: '#fff' }}>
          Loading coding problem...
        </div>
      )}
    </div>
  );
};

export default CodingPractice;
