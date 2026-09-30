import { useState, useEffect, useRef } from 'react';
import { api } from '../../../shared/services/api';
import CompanySidebar from './CompanySidebar';
import '../styles/CompanyCodingProblems.css';
import AIGenerationPanel from '../../shared/components/AIGenerationPanel';

const CompanyCodingProblems = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [problemStats, setProblemStats] = useState(null);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    title: '',
    entryFunction: 'solve',
    difficulty: 'Medium',
    category: 'Arrays & Hashing',
    tags: '',
    statementMarkdown: '',
    description: '',
    constraints: [''],
    testCases: [
      {
        input: '',
        expectedOutput: '',
        isSample: true,
        isHidden: false,
        timeLimitMs: 2000,
        memoryLimitMb: 256
      }
    ]
  });
  const [codingTopics, setCodingTopics] = useState([]);
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/coding/problems/company');
      if (res.data && res.data.success) {
        setProblems(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching company coding problems:', err);
      setError(err.message || 'Failed to fetch coding problems');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
    api.get('/coding/problems/topics')
      .then(res => setCodingTopics(res.data?.data || []))
      .catch(err => console.error('Error fetching coding topics:', err));
  }, []);

  const handleOpenCreateModal = (prob = null) => {
    if (prob) {
      setSelectedProblem(prob);
      setFormData({
        title: prob.title || '',
        entryFunction: prob.entryFunction || 'solve',
        difficulty: prob.difficulty || 'Medium',
        category: prob.category || 'Algorithms',
        tags: Array.isArray(prob.tags) ? prob.tags.join(', ') : '',
        statementMarkdown: prob.statementMarkdown || prob.description || '',
        description: prob.description || prob.statementMarkdown || '',
        constraints: prob.constraints && prob.constraints.length > 0 ? prob.constraints : [''],
        testCases: prob.testCases && prob.testCases.length > 0 ? prob.testCases : [
          {
            input: '',
            expectedOutput: '',
            isSample: true,
            isHidden: false,
            timeLimitMs: 2000,
            memoryLimitMb: 256
          }
        ]
      });
    } else {
      setSelectedProblem(null);
      setFormData({
        title: '',
        entryFunction: 'solve',
        difficulty: 'Medium',
        category: 'Arrays & Hashing',
        tags: '',
        statementMarkdown: '',
        description: '',
        constraints: [''],
        testCases: [
          {
            input: '',
            expectedOutput: '',
            isSample: true,
            isHidden: false,
            timeLimitMs: 2000,
            memoryLimitMb: 256
          }
        ]
      });
    }
    setShowCreateModal(true);
  };

  const submitProblemData = async (dataToSave) => {
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    setSaving(true);
    try {
      const payload = {
        ...dataToSave,
        description: dataToSave.statementMarkdown || dataToSave.description,
        tags: Array.isArray(dataToSave.tags)
          ? dataToSave.tags
          : String(dataToSave.tags || '').split(',').map(tag => tag.trim()).filter(Boolean)
      };
      if (selectedProblem) {
        await api.put(`/coding/problems/${selectedProblem._id}`, payload);
      } else {
        await api.post('/coding/problems', payload);
      }
      setShowCreateModal(false);
      setShowAIGenerateModal(false);
      fetchProblems();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error saving coding problem');
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm("Are you sure you want to delete this coding problem? This will also remove it from any existing tests.")) return;
    try {
      await api.delete(`/coding/problems/${problemId}`);
      fetchProblems();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || 'Error deleting coding problem');
    }
  };

  const handleSaveProblem = async (e) => {
    e.preventDefault();
    await submitProblemData(formData);
  };

  const handleAddTestCase = () => {
    setFormData({
      ...formData,
      testCases: [
        ...formData.testCases,
        {
          input: '',
          expectedOutput: '',
          isSample: false,
          isHidden: true,
          timeLimitMs: 2000,
          memoryLimitMb: 256
        }
      ]
    });
  };

  const handleTestCaseChange = (idx, field, val) => {
    const updated = [...formData.testCases];
    updated[idx][field] = val;
    if (field === 'isSample' && val === true) {
      updated[idx].isHidden = false;
    } else if (field === 'isHidden' && val === true) {
      updated[idx].isSample = false;
    }
    setFormData({ ...formData, testCases: updated });
  };

  const handleRemoveTestCase = (idx) => {
    const updated = formData.testCases.filter((_, i) => i !== idx);
    setFormData({ ...formData, testCases: updated });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setFormData({
          ...formData,
          title: parsed.title || formData.title,
          difficulty: parsed.difficulty || formData.difficulty,
          category: parsed.category || formData.category,
          tags: Array.isArray(parsed.tags) ? parsed.tags.join(', ') : formData.tags,
          statementMarkdown: parsed.statementMarkdown || parsed.description || formData.statementMarkdown,
          constraints: parsed.constraints || formData.constraints,
          testCases: Array.isArray(parsed.testCases) ? [...formData.testCases, ...parsed.testCases] : formData.testCases
        });
        alert('Successfully imported coding problem data!');
      } catch (err) {
        alert('Invalid JSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const handleOpenStatsModal = async (prob) => {
    setSelectedProblem(prob);
    try {
      const res = await api.get(`/coding/problems/${prob._id}/submissions`);
      if (res.data && res.data.success) {
        setProblemStats(res.data.data);
        setShowStatsModal(true);
      }
    } catch (err) {
      alert(err.message || 'Error fetching problem submission stats');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <CompanySidebar />
      <div className="company-coding-container" style={{ flex: 1 }}>
        <div className="coding-header">
          <h2>Company Coding Problem Management</h2>
          <button className="btn-primary" onClick={() => handleOpenCreateModal()}>
            <i className="fas fa-plus"></i> Create New Problem
          </button>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div>Loading coding problems...</div>
        ) : problems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            No coding problems created yet. Click "Create New Problem" to get started.
          </div>
        ) : (
          <div className="problem-grid">
            {problems.map(prob => (
              <div key={prob._id} className="problem-card">
                <div>
                  <div className="problem-card-title">
                    <span>{prob.title}</span>
                    <span className={`badge-difficulty difficulty-${prob.difficulty}`}>
                      {prob.difficulty}
                    </span>
                  </div>
                  <div className="test-card-meta">
                    <span><strong>Category:</strong> {prob.category}</span>
                    <span><strong>Test Cases:</strong> {prob.testCases ? prob.testCases.length : 0}</span>
                    <span><strong>Submissions:</strong> {prob.totalSubmissions || 0}</span>
                    <span><strong>Acceptance Rate:</strong> {prob.acceptanceRate || 0}%</span>
                  </div>
                </div>
                <div className="test-card-actions">
                  <button className="btn-secondary" onClick={() => handleOpenCreateModal(prob)}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button className="btn-secondary" onClick={() => handleOpenStatsModal(prob)}>
                    <i className="fas fa-chart-line"></i> Stats & Submissions
                  </button>
                  <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteProblem(prob._id)}>
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>{selectedProblem ? 'Edit Coding Problem' : 'Create Coding Problem'}</h3>
              <form onSubmit={handleSaveProblem}>
                <div className="form-group">
                  <label>Problem Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Two Sum Optimized"
                  />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {!codingTopics.includes(formData.category) && formData.category && (
                        <option value={formData.category}>{formData.category} (legacy)</option>
                      )}
                      {codingTopics.filter(topic => topic !== 'All').map(topic => (
                        <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. BFS, DFS, shortest path"
                  />
                </div>
                <div className="form-group">
                  <label>Problem Statement (Markdown Supported)</label>
                  <textarea
                    rows={6}
                    required
                    value={formData.statementMarkdown}
                    onChange={(e) => setFormData({ ...formData, statementMarkdown: e.target.value })}
                    placeholder="Describe problem, input/output formats, and explanations..."
                  />
                </div>

                <div className="form-group">
                  <label>Entry Function (JavaScript / Python)</label>
                  <input
                    type="text"
                    value={formData.entryFunction}
                    onChange={(e) => setFormData({ ...formData, entryFunction: e.target.value })}
                    placeholder="solve"
                  />
                  <small>Function inputs are JSON values separated by spaces, for example [2,7,11,15] 9. Return values are compared as JSON. Other languages use stdin/stdout directly.</small>
                </div>

                <h4>Test Cases ({formData.testCases.length})</h4>
                {formData.testCases.map((tc, idx) => (
                  <div key={idx} className="testcase-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>Test Case #{idx + 1}</strong>
                      {formData.testCases.length > 1 && (
                        <button type="button" className="btn-danger" onClick={() => handleRemoveTestCase(idx)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label>Input (stdin)</label>
                        <textarea
                          rows={3}
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Expected Output (stdout)</label>
                        <textarea
                          rows={3}
                          value={tc.expectedOutput}
                          onChange={(e) => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={tc.isSample}
                          onChange={(e) => handleTestCaseChange(idx, 'isSample', e.target.checked)}
                        />
                        Visible Sample Case
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={(e) => handleTestCaseChange(idx, 'isHidden', e.target.checked)}
                        />
                        Hidden Evaluation Case
                      </label>
                    </div>
                  </div>
                ))}

                  <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                    <button type="button" className="btn-secondary" onClick={handleAddTestCase}>
                      + Add Test Case
                    </button>
                    <label className="btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '10px 15px', borderRadius: '6px' }}>
                      <i className="fas fa-file-import" style={{ marginRight: '8px' }}></i> Import Full Problem (JSON)
                      <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ backgroundColor: 'var(--secondary-color)', color: 'white', border: 'none' }}
                      onClick={() => setShowAIGenerateModal(true)}
                    >
                      <i className="fas fa-robot" style={{ marginRight: '8px' }}></i> Generate with AI
                    </button>
                  </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Problem'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Generate Panel */}
        {showAIGenerateModal && (
          <AIGenerationPanel
            contentType="coding"
            onClose={() => setShowAIGenerateModal(false)}
            onSave={(generated, publishNow = false) => {
              const updatedFormData = {
                ...formData,
                title: generated.title || '',
                difficulty: generated.difficulty || 'Medium',
                category: generated.category || generated.tags?.[0] || formData.category,
                tags: generated.tags || [],
                statementMarkdown: generated.statementMarkdown || '',
                constraints: generated.constraints ? [generated.constraints] : [''],
                testCases: (generated.sampleTestCases || generated.hiddenTestCases)
                  ? [
                      ...(generated.sampleTestCases || []).map(tc => ({ ...tc, isSample: true, isHidden: false })),
                      ...(generated.hiddenTestCases || []).map(tc => ({ ...tc, isSample: false, isHidden: true }))
                    ]
                  : (generated.testCases || []),
                starterCode: generated.starterCode || { javascript: '' },
                referenceSolution: generated.referenceSolution || { javascript: '' }
              };
              setFormData(updatedFormData);
              if (publishNow) {
                submitProblemData(updatedFormData);
              }
            }}
          />
        )}

        {/* Stats Modal */}
        {showStatsModal && problemStats && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Stats for {selectedProblem?.title}</h3>
                <button className="btn-secondary" onClick={() => setShowStatsModal(false)}>
                  Close
                </button>
              </div>

              <div className="submissions-stats-bar">
                <div><span>Total Submissions:</span> {problemStats.totalSubmissions}</div>
                <div><span>Total Accepted:</span> {problemStats.totalAccepted}</div>
                <div><span>Acceptance Rate:</span> {problemStats.acceptanceRate}%</div>
                <div><span>Unique Students:</span> {problemStats.uniqueStudentsCount}</div>
              </div>

              <h4>Recent Submissions</h4>
              {(!problemStats.recentSubmissions || problemStats.recentSubmissions.length === 0) ? (
                <p style={{ color: '#6b7280' }}>No submissions yet.</p>
              ) : (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Language</th>
                      <th>Verdict</th>
                      <th>Runtime</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problemStats.recentSubmissions.map((sub, idx) => (
                      <tr key={idx}>
                        <td>{sub.userId?.name || sub.userId?.email || 'Student'}</td>
                        <td>{sub.language}</td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: sub.verdict === 'Accepted' ? '#065f46' : '#991b1b'
                          }}>
                            {sub.verdict}
                          </span>
                        </td>
                        <td>{sub.runtimeMs} ms</td>
                        <td>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyCodingProblems;
