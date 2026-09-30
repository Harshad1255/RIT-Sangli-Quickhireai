import { useState, useEffect } from 'react';
import { api } from '../../../shared/services/api';
import '../styles/StudentCodingProblemList.css';

const StudentCodingProblemList = ({ onSelectProblem }) => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    const params = {};
    if (difficultyFilter) params.difficulty = difficultyFilter;
    if (debouncedSearchQuery) params.search = debouncedSearchQuery;
    setLoading(true);
    setError('');

    api.get('/coding/problems', { params })
      .then(res => {
        if (active && res.data?.success) setProblems(res.data.data || []);
      })
      .catch(err => {
        if (!active) return;
        console.error('Error fetching coding problems:', err);
        setProblems([]);
        setError(err.response?.data?.error || err.message || 'Failed to load coding problems');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [difficultyFilter, debouncedSearchQuery, refreshVersion]);

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Solved':
        return <span className="status-solved">SOLVED</span>;
      case 'Attempted':
        return <span className="status-attempted">ATTEMPTED</span>;
      default:
        return <span className="status-unattempted">UNATTEMPTED</span>;
    }
  };

  return (
    <div className="student-coding-list">
      <div className="student-coding-header">
        <h2>Coding Practice Platform</h2>
        <p>Sharpen your data structures & algorithms and technical interview skills.</p>
      </div>

      <div className="coding-filters">
        <input
          type="text"
          className="coding-filter-input"
          placeholder="Search problems..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="coding-filter-input"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div>Loading practice problems...</div>
      ) : problems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <i className="fas fa-code" style={{ fontSize: '2.5rem', color: '#9ca3af', marginBottom: 12 }}></i>
          <p style={{ color: '#4b5563', fontSize: '1.1rem' }}>No coding problems match your filter criteria.</p>
        </div>
      ) : (
        <div className="coding-problems-table-wrapper">
          <table className="coding-problems-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Category</th>
                <th>Acceptance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {problems.map(prob => (
                <tr key={prob._id}>
                  <td>{getStatusBadge(prob.status)}</td>
                  <td>
                    <strong
                      style={{ cursor: 'pointer', color: '#2563eb' }}
                      onClick={() => onSelectProblem(prob)}
                    >
                      {prob.title}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge-difficulty difficulty-${prob.difficulty}`}>
                      {prob.difficulty}
                    </span>
                  </td>
                  <td>
                    <strong>{prob.category || 'Uncategorized'}</strong>
                    {prob.tags?.length > 0 && <div>{prob.tags.join(', ')}</div>}
                  </td>
                  <td>{prob.acceptanceRate || 0}%</td>
                  <td>
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                      onClick={() => onSelectProblem(prob)}
                    >
                      Solve Problem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentCodingProblemList;
