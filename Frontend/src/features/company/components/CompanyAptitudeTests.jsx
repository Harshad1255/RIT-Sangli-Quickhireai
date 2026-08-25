import { useState, useEffect } from 'react';
import { api } from '../../../shared/services/api';
import CompanySidebar from './CompanySidebar';
import '../styles/CompanyAptitudeTests.css';
import AIGenerationPanel from '../../shared/components/AIGenerationPanel';

const CompanyAptitudeTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testResults, setTestResults] = useState(null);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    title: '',
    totalTimeMinutes: 60,
    passThreshold: 60,
    showAnswersAfterSubmit: true,
    sections: [{ name: 'General', timeLimitMinutes: 0 }],
    questions: [
      {
        sectionName: 'General',
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        marks: 1,
        negativeMarks: 0.25,
        difficulty: 'Medium'
      }
    ]
  });

  // Assign Form State
  const [candidateEmails, setCandidateEmails] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/aptitude/company');
      if (res.data && res.data.success) {
        setTests(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError(err.message || 'Failed to fetch aptitude tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleOpenCreateModal = (test = null) => {
    if (test) {
      setSelectedTest(test);
      setFormData({
        title: test.title || '',
        totalTimeMinutes: test.totalTimeMinutes || 60,
        passThreshold: test.passThreshold || 60,
        showAnswersAfterSubmit: test.showAnswersAfterSubmit !== undefined ? test.showAnswersAfterSubmit : true,
        sections: test.sections && test.sections.length > 0 ? test.sections : [{ name: 'General', timeLimitMinutes: 0 }],
        questions: test.questions && test.questions.length > 0 ? test.questions : [
          {
            sectionName: 'General',
            text: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            marks: 1,
            negativeMarks: 0.25,
            difficulty: 'Medium'
          }
        ]
      });
    } else {
      setSelectedTest(null);
      setFormData({
        title: '',
        totalTimeMinutes: 60,
        passThreshold: 60,
        showAnswersAfterSubmit: true,
        sections: [{ name: 'General', timeLimitMinutes: 0 }],
        questions: [
          {
            sectionName: 'General',
            text: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            marks: 1,
            negativeMarks: 0.25,
            difficulty: 'Medium'
          }
        ]
      });
    }
    setShowCreateModal(true);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const submitTestData = async (dataToSave) => {
    setIsSaving(true);
    setSaveError('');
    try {
      if (selectedTest) {
        await api.put(`/aptitude/${selectedTest._id}`, dataToSave);
      } else {
        await api.post('/aptitude', dataToSave);
      }
      setShowCreateModal(false);
      setShowAIGenerateModal(false);
      fetchTests();
      alert('Test published successfully!');
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Error saving aptitude test');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    await submitTestData(formData);
  };

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          sectionName: formData.sections[0]?.name || 'General',
          text: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          marks: 1,
          negativeMarks: 0.25,
          difficulty: 'Medium'
        }
      ]
    });
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...formData.questions];
    updated[idx][field] = value;
    setFormData({ ...formData, questions: updated });
  };

  const handleOptionChange = (qIdx, optIdx, val) => {
    const updated = [...formData.questions];
    updated[qIdx].options[optIdx] = val;
    setFormData({ ...formData, questions: updated });
  };

  const handleRemoveQuestion = (idx) => {
    const updated = formData.questions.filter((_, i) => i !== idx);
    setFormData({ ...formData, questions: updated });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          const formattedQuestions = parsed.map(q => ({
            sectionName: q.sectionName || 'General',
            text: q.text || '',
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            marks: typeof q.marks === 'number' ? q.marks : 1,
            negativeMarks: typeof q.negativeMarks === 'number' ? q.negativeMarks : 0.25,
            difficulty: q.difficulty || 'Medium'
          }));
          setFormData({ ...formData, questions: [...formData.questions, ...formattedQuestions] });
          alert(`Successfully imported ${formattedQuestions.length} questions!`);
        } else {
          alert('JSON file must contain an array of questions.');
        }
      } catch (err) {
        alert('Invalid JSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const handleOpenAssignModal = (test) => {
    setSelectedTest(test);
    setCandidateEmails('');
    setDueDate('');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!candidateEmails.trim()) return;

    const emails = candidateEmails
      .split(/[\n,]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const candidates = emails.map(email => ({
      email,
      dueDate: dueDate || null
    }));

    try {
      await api.post(`/aptitude/${selectedTest._id}/assign`, { candidates });
      alert(`Successfully assigned test to ${candidates.length} candidate(s)`);
      setShowAssignModal(false);
      fetchTests();
    } catch (err) {
      alert(err.message || 'Error assigning candidates');
    }
  };

  const handleOpenResultsModal = async (test) => {
    setSelectedTest(test);
    try {
      const res = await api.get(`/aptitude/${test._id}/results`);
      if (res.data && res.data.success) {
        setTestResults(res.data.data);
        setShowResultsModal(true);
      }
    } catch (err) {
      alert(err.message || 'Error fetching test results');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <CompanySidebar />
      <div className="company-aptitude-container" style={{ flex: 1 }}>
        <div className="aptitude-header">
          <h2>Company Aptitude Test Management</h2>
          <button className="btn-primary" onClick={() => handleOpenCreateModal()}>
            <i className="fas fa-plus"></i> Create New Test
          </button>
        </div>

        {error && <div className="error-message" style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div>Loading tests...</div>
        ) : tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            No aptitude tests created yet. Click "Create New Test" to get started.
          </div>
        ) : (
          <div className="test-grid">
            {tests.map(test => (
              <div key={test._id} className="test-card">
                <div>
                  <div className="test-card-title">{test.title}</div>
                  <div className="test-card-meta">
                    <span><strong>Duration:</strong> {test.totalTimeMinutes} mins</span>
                    <span><strong>Pass Threshold:</strong> {test.passThreshold}%</span>
                    <span><strong>Questions:</strong> {test.questions ? test.questions.length : 0}</span>
                    <span><strong>Assigned:</strong> {test.assignedCandidates ? test.assignedCandidates.length : 0} candidates</span>
                  </div>
                </div>
                <div className="test-card-actions">
                  <button className="btn-secondary" onClick={() => handleOpenCreateModal(test)}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button className="btn-secondary" onClick={() => handleOpenAssignModal(test)}>
                    <i className="fas fa-user-plus"></i> Assign
                  </button>
                  <button className="btn-secondary" onClick={() => handleOpenResultsModal(test)}>
                    <i className="fas fa-chart-bar"></i> Results
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
              <h3>{selectedTest ? 'Edit Aptitude Test' : 'Create Aptitude Test'}</h3>
              <form onSubmit={handleSaveTest}>
                <div className="form-group">
                  <label>Test Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Frontend Engineer Screening Aptitude Test"
                  />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Total Time Limit (Minutes)</label>
                    <input
                      type="number"
                      required
                      value={formData.totalTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, totalTimeMinutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Pass Threshold (%)</label>
                    <input
                      type="number"
                      required
                      value={formData.passThreshold}
                      onChange={(e) => setFormData({ ...formData, passThreshold: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <h4>Questions ({formData.questions.length})</h4>
                {formData.questions.map((q, qIdx) => (
                  <div key={qIdx} className="question-builder-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>Question #{qIdx + 1}</strong>
                      {formData.questions.length > 1 && (
                        <button type="button" className="btn-danger" onClick={() => handleRemoveQuestion(qIdx)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Question Text</label>
                      <input
                        type="text"
                        required
                        value={q.text}
                        onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                        placeholder="Enter question text"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="form-group" style={{ margin: 0 }}>
                          <label>Option {optIdx + 1} {q.correctIndex === optIdx ? ' (Correct)' : ''}</label>
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Correct Option Index (0 to 3)</label>
                        <select
                          value={q.correctIndex}
                          onChange={(e) => handleQuestionChange(qIdx, 'correctIndex', Number(e.target.value))}
                        >
                          <option value={0}>Option 1</option>
                          <option value={1}>Option 2</option>
                          <option value={2}>Option 3</option>
                          <option value={3}>Option 4</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Marks</label>
                        <input
                          type="number"
                          step="0.5"
                          value={q.marks}
                          onChange={(e) => handleQuestionChange(qIdx, 'marks', Number(e.target.value))}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Negative Marks</label>
                        <input
                          type="number"
                          step="0.25"
                          value={q.negativeMarks}
                          onChange={(e) => handleQuestionChange(qIdx, 'negativeMarks', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ marginBottom: 20, display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={handleAddQuestion}>
                    + Add Question Manually
                  </button>
                  <label className="btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '10px 15px', borderRadius: '6px' }}>
                    <i className="fas fa-file-import" style={{ marginRight: '8px' }}></i> Import JSON
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

                {saveError && (
                  <div style={{ color: 'white', background: 'var(--danger-color)', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                    {saveError}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Test'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Generate Panel */}
        {showAIGenerateModal && (
          <AIGenerationPanel
            contentType="aptitude"
            onClose={() => setShowAIGenerateModal(false)}
            isSaving={isSaving}
            saveError={saveError}
            onSave={(generatedData, publishNow = false) => {
              // Only merge the dummy question if it actually has content, otherwise just use AI questions
              let existingQuestions = formData.questions;
              if (existingQuestions.length === 1 && !existingQuestions[0].text.trim() && !existingQuestions[0].options.some(o => o.trim())) {
                existingQuestions = [];
              }
              const updatedFormData = {
                ...formData,
                questions: [...existingQuestions, ...generatedData]
              };
              
              // Ensure a title exists if we are publishing immediately
              if (publishNow && (!updatedFormData.title || updatedFormData.title.trim() === '')) {
                updatedFormData.title = `AI Assessment - ${new Date().toLocaleDateString()}`;
              }

              setFormData(updatedFormData);
              if (publishNow) {
                submitTestData(updatedFormData);
              }
            }}
          />
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 500 }}>
              <h3>Assign Aptitude Test: {selectedTest?.title}</h3>
              <form onSubmit={handleAssignSubmit}>
                <div className="form-group">
                  <label>Candidate Emails (comma or new-line separated)</label>
                  <textarea
                    rows={5}
                    required
                    value={candidateEmails}
                    onChange={(e) => setCandidateEmails(e.target.value)}
                    placeholder="student1@example.com&#10;student2@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Due Date (optional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Assign Test
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {showResultsModal && testResults && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Results for {selectedTest?.title}</h3>
                <button className="btn-secondary" onClick={() => setShowResultsModal(false)}>
                  Close
                </button>
              </div>

              <div style={{ display: 'flex', gap: 24, margin: '16px 0', padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
                <div><strong>Total Assigned:</strong> {testResults.totalAssigned}</div>
                <div><strong>Completed:</strong> {testResults.totalCompleted}</div>
                <div><strong>Average Score:</strong> {testResults.averageScore}</div>
                <div><strong>Passed:</strong> {testResults.passCount}</div>
                <div><strong>Failed:</strong> {testResults.failCount}</div>
              </div>

              <h4>Candidate Results Table</h4>
              {testResults.candidates.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No candidate attempts completed yet.</p>
              ) : (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Status</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.candidates.map((cand, idx) => (
                      <tr key={idx}>
                        <td>{cand.student?.name || cand.student?.email || 'Candidate'}</td>
                        <td>{cand.totalScore} / {cand.maxScore}</td>
                        <td>{cand.percentage}%</td>
                        <td>
                          <span className={cand.passed ? 'badge-pass' : 'badge-fail'}>
                            {cand.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                        <td>{new Date(cand.submittedAt).toLocaleDateString()}</td>
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

export default CompanyAptitudeTests;
