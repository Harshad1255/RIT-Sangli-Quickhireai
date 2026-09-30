import { useEffect, useState } from 'react';
import { api } from '../../../shared/services/api';

const ScholasticDailyDSA = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    difficulty: 'Easy',
    category: 'Daily DSA',
    statementMarkdown: '',
    testInput: '',
    expectedOutput: ''
  });

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/coding/problems/company');
      if (res.data?.success) {
        const dailyProblems = (res.data.data || []).filter((problem) => problem.isDailyChallenge || problem.category === 'Daily DSA');
        setProblems(dailyProblems);
      }
    } catch (err) {
      console.error('Error fetching daily DSA problems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      difficulty: 'Easy',
      category: 'Daily DSA',
      statementMarkdown: '',
      testInput: '',
      expectedOutput: ''
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/coding/problems', {
        title: formData.title,
        difficulty: formData.difficulty,
        category: 'Daily DSA',
        statementMarkdown: formData.statementMarkdown,
        description: formData.statementMarkdown,
        isDailyChallenge: true,
        dailyLabel: 'Daily DSA',
        testCases: [{
          input: formData.testInput,
          expectedOutput: formData.expectedOutput,
          isSample: true,
          isHidden: false
        }]
      });
      setShowCreateModal(false);
      resetForm();
      await fetchProblems();
    } catch (err) {
      console.error('Error creating daily DSA problem:', err);
      alert(err.message || 'Unable to create daily DSA problem');
    } finally {
      setSaving(false);
    }
  };

  const toggleDailyChallenge = async (problem) => {
    try {
      const nextValue = !problem.isDailyChallenge;
      const payload = {
        ...problem,
        category: nextValue ? 'Daily DSA' : problem.category === 'Daily DSA' ? 'Algorithms' : problem.category,
        isDailyChallenge: nextValue,
        dailyLabel: nextValue ? 'Daily DSA' : ''
      };

      await api.put(`/coding/problems/${problem._id}`, payload);
      fetchProblems();
    } catch (err) {
      console.error('Error updating daily challenge:', err);
      alert(err.message || 'Unable to update daily DSA list');
    }
  };

  return (
    <div>
      <div className="list-header">
        <div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Daily DSA List</h3>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Select the coding problems that students should solve daily in the scholastic practice tab.
          </p>
        </div>
        <button className="action-btn" type="button" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus"></i> Create Daily Problem
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Loading daily DSA list...</div>
      ) : problems.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-calendar-day"></i>
          <h3>No Daily DSA selected</h3>
          <p>Mark your coding problems as daily practice items so students see them in the DSA flow.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {problems.map((problem) => (
            <div key={problem._id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>{problem.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {problem.difficulty} • {problem.category} • {problem.totalSubmissions || 0} attempts
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleDailyChallenge(problem)}
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.7rem 1rem',
                  cursor: 'pointer',
                  background: problem.isDailyChallenge ? '#dcfce7' : '#eff6ff',
                  color: problem.isDailyChallenge ? '#166534' : '#1d4ed8',
                  fontWeight: 700
                }}
              >
                <i className="fas fa-calendar-day" style={{ marginRight: '0.35rem' }}></i>
                {problem.isDailyChallenge ? 'Remove from Daily DSA' : 'Add to Daily DSA'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px' }}>
            <h3 style={{ marginTop: 0 }}>Create Daily DSA Problem</h3>
            <p style={{ color: '#64748b', marginTop: 0 }}>
              This problem will be added directly to the student Scholastic Daily DSA list.
            </p>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Problem Title</label>
                <input
                  required
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  placeholder="e.g. Find the First Repeated Element"
                />
              </div>

              <div className="form-group">
                <label>Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(event) => setFormData({ ...formData, difficulty: event.target.value })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="form-group">
                <label>Problem Statement</label>
                <textarea
                  required
                  rows={6}
                  value={formData.statementMarkdown}
                  onChange={(event) => setFormData({ ...formData, statementMarkdown: event.target.value })}
                  placeholder="Describe the DSA problem, input format, and output format."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Sample Input</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.testInput}
                    onChange={(event) => setFormData({ ...formData, testInput: event.target.value })}
                    placeholder="Example input"
                  />
                </div>
                <div className="form-group">
                  <label>Expected Output</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.expectedOutput}
                    onChange={(event) => setFormData({ ...formData, expectedOutput: event.target.value })}
                    placeholder="Example output"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn-secondary" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  <i className={`fas fa-${saving ? 'spinner fa-spin' : 'calendar-day'}`}></i>
                  {saving ? ' Creating...' : ' Create Daily Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholasticDailyDSA;
