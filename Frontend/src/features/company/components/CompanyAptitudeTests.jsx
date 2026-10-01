import { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../../../shared/services/api';
import { getApiBaseUrl } from '../../../config/api';
import CompanySidebar from './CompanySidebar';
import '../styles/CompanyAptitudeTests.css';
import AIGenerationPanel from '../../shared/components/AIGenerationPanel';

const formatDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const CompanyAptitudeTests = () => {
  const [tests, setTests] = useState([]);
  const [availableCodingProblems, setAvailableCodingProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);
  const [snapshotImages, setSnapshotImages] = useState({});

  const defaultQuestion = {
    sectionName: 'General',
    text: '',
    options: [
      { originalIndex: 0, text: '' },
      { originalIndex: 1, text: '' },
      { originalIndex: 2, text: '' },
      { originalIndex: 3, text: '' }
    ],
    correctAnswer: 0,
    marks: 1,
    negativeMarks: 0.25,
    difficulty: 'Medium'
  };

  const [formData, setFormData] = useState({
    title: '',
    totalTimeMinutes: 60,
    maxViolationCount: 3,
    passThreshold: 60,
    showAnswersAfterSubmit: true,
    sections: [{ name: 'General', timeLimitMinutes: 0 }],
    questions: [ JSON.parse(JSON.stringify(defaultQuestion)) ],
    codingProblems: [],
    isPublished: true,
    schedulingMode: 'always_open',
    slots: []
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
      const codeRes = await api.get('/coding/problems/company');
      if (codeRes.data && codeRes.data.success) {
        setAvailableCodingProblems(codeRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError(err.message || 'Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (!showResultsModal) {
      Object.values(snapshotImages).forEach(imageUrl => URL.revokeObjectURL(imageUrl));
      setSnapshotImages({});
      setExpandedAttemptId(null);
    }
  }, [showResultsModal]);

  const handleOpenCreateModal = (test = null) => {
    if (test) {
      setSelectedTest(test);
      setFormData({
        title: test.title || '',
        totalTimeMinutes: test.totalTimeMinutes || 60,
        maxViolationCount: test.maxViolationCount || 3,
        passThreshold: test.passThreshold || 60,
        showAnswersAfterSubmit: test.showAnswersAfterSubmit !== undefined ? test.showAnswersAfterSubmit : true,
        sections: test.sections && test.sections.length > 0 ? test.sections : [{ name: 'General', timeLimitMinutes: 0 }],
        questions: test.questions && test.questions.length > 0 ? test.questions : [ JSON.parse(JSON.stringify(defaultQuestion)) ],
        codingProblems: test.codingProblems ? test.codingProblems.map(cp => cp._id || cp) : [],
        isPublished: test.isPublished !== undefined ? test.isPublished : true,
        schedulingMode: test.schedulingMode || 'always_open',
        slots: test.slots ? test.slots.map(s => ({
          ...s,
          startTime: formatDateTimeLocal(s.startTime),
          endTime: formatDateTimeLocal(s.endTime)
        })) : []
      });
    } else {
      setSelectedTest(null);
      setFormData({
        title: '',
        totalTimeMinutes: 60,
        maxViolationCount: 3,
        passThreshold: 60,
        showAnswersAfterSubmit: true,
        sections: [{ name: 'General', timeLimitMinutes: 0 }],
        questions: [ JSON.parse(JSON.stringify(defaultQuestion)) ],
        codingProblems: [],
        isPublished: true,
        schedulingMode: 'always_open',
        slots: []
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
      const normalizedData = {
        ...dataToSave,
        slots: (dataToSave.slots || []).map(slot => ({
          ...slot,
          startTime: slot.startTime ? new Date(slot.startTime).toISOString() : slot.startTime,
          endTime: slot.endTime ? new Date(slot.endTime).toISOString() : slot.endTime
        }))
      };
      let res;
      if (selectedTest) {
        res = await api.put(`/aptitude/${selectedTest._id}`, normalizedData);
      } else {
        res = await api.post('/aptitude', normalizedData);
      }
      setShowCreateModal(false);
      setShowAIGenerateModal(false);
      fetchTests();
      
      const code = res.data?.data?.entranceCode;
      if (code) {
        alert(`Test published successfully!\n\n🔑 Candidate Entrance Code: ${code}\n\n(This code is also visible on your dashboard)`);
      } else {
        alert('Test published successfully!');
      }
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

  const handleAddSlot = () => {
    setFormData({
      ...formData,
      slots: [
        ...formData.slots,
        { label: `Slot ${formData.slots.length + 1}`, startTime: '', endTime: '', capacity: '' }
      ]
    });
  };

  const handleRemoveSlot = (idx) => {
    const updated = [...formData.slots];
    updated.splice(idx, 1);
    setFormData({ ...formData, slots: updated });
  };

  const handleSlotChange = (idx, field, value) => {
    const updated = [...formData.slots];
    updated[idx][field] = value;
    setFormData({ ...formData, slots: updated });
  };

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        JSON.parse(JSON.stringify(defaultQuestion))
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
    updated[qIdx].options[optIdx].text = val;
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
            options: Array.isArray(q.options) && q.options.length === 4 
              ? q.options.map((opt, i) => ({ originalIndex: i, text: typeof opt === 'string' ? opt : (opt.text || '') })) 
              : [
                  { originalIndex: 0, text: '' },
                  { originalIndex: 1, text: '' },
                  { originalIndex: 2, text: '' },
                  { originalIndex: 3, text: '' }
                ],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : (typeof q.correctIndex === 'number' ? q.correctIndex : 0),
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

  const handleReviewAttempt = async (candidate) => {
    if (expandedAttemptId === candidate.attemptId) {
      setExpandedAttemptId(null);
      return;
    }
    setExpandedAttemptId(candidate.attemptId);
    const snapshots = (candidate.securityTimeline || []).filter(event => event.snapshotUrl && !snapshotImages[event.id]);
    const loadedImages = await Promise.all(snapshots.map(async event => {
      try {
        const response = await api.get(event.snapshotUrl, { responseType: 'blob' });
        return [event.id, URL.createObjectURL(response.data)];
      } catch (loadError) {
        console.warn('Unable to load a private proctoring snapshot:', loadError.message || loadError);
        return [event.id, null];
      }
    }));
    setSnapshotImages(previous => ({ ...previous, ...Object.fromEntries(loadedImages.filter(([, imageUrl]) => imageUrl)) }));
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm("Are you sure you want to delete this test? If this test has already been published and attempted by candidates, it will be archived.")) return;
    try {
      await api.delete(`/aptitude/${testId}`);
      fetchTests();
    } catch (err) {
      alert(err.message || "Failed to delete test");
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
                    <span><strong>Status:</strong> {test.isPublished !== false ? 'Published' : 'Draft'}</span>
                    {test.isPublished !== false && test.entranceCode && (
                      <span style={{ 
                        background: '#e0e7ff', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        color: '#4338ca',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(test.entranceCode);
                        alert('Entrance Code copied to clipboard: ' + test.entranceCode);
                      }}>
                        <i className="fas fa-key"></i> Code: {test.entranceCode}
                      </span>
                    )}
                    <span><strong>Duration:</strong> {test.totalTimeMinutes} mins</span>
                    <span><strong>Questions:</strong> {test.questions ? test.questions.length : 0}</span>
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
                  <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteTest(test._id)}>
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
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Maximum Proctoring Violations</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={formData.maxViolationCount}
                      onChange={(e) => setFormData({ ...formData, maxViolationCount: Math.max(1, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Status</label>
                    <select
                      value={formData.isPublished ? 'published' : 'draft'}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.value === 'published' })}
                    >
                      <option value="published">Published (Active)</option>
                      <option value="draft">Draft (Unpublished)</option>
                    </select>
                  </div>
                </div>

                <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />
                <h4>Scheduling</h4>
                <div className="form-group">
                  <label>Scheduling Mode</label>
                  <select 
                    value={formData.schedulingMode}
                    onChange={(e) => setFormData({ ...formData, schedulingMode: e.target.value })}
                  >
                    <option value="always_open">Always Open (No slots)</option>
                    <option value="multi_slot">Multi-Slot / Time Window</option>
                  </select>
                </div>

                {formData.schedulingMode !== 'always_open' && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label style={{ margin: 0 }}>Time Slots</label>
                      <button type="button" className="btn-secondary" onClick={handleAddSlot} style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
                        + Add Slot
                      </button>
                    </div>
                    {formData.slots.length === 0 && (
                      <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>Please add at least one slot, or change scheduling mode to Always Open.</p>
                    )}
                    {formData.slots.map((slot, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10, background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Label</label>
                          <input type="text" value={slot.label || ''} onChange={(e) => handleSlotChange(idx, 'label', e.target.value)} placeholder="e.g. Morning Batch" />
                        </div>
                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Start Time</label>
                          <input type="datetime-local" required value={slot.startTime} onChange={(e) => handleSlotChange(idx, 'startTime', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>End Time</label>
                          <input type="datetime-local" required value={slot.endTime} onChange={(e) => handleSlotChange(idx, 'endTime', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ width: 80, margin: 0 }}>
                          <label style={{ fontSize: '0.8rem' }}>Capacity</label>
                          <input type="number" placeholder="&#8734;" value={slot.capacity || ''} onChange={(e) => handleSlotChange(idx, 'capacity', e.target.value ? Number(e.target.value) : null)} />
                        </div>
                        <button type="button" className="btn-danger" style={{ padding: '8px 12px' }} onClick={() => handleRemoveSlot(idx)}>X</button>
                      </div>
                    ))}
                  </div>
                )}
                <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

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
                    <div className="form-group">
                      <label>Question Image (Optional)</label>
                      <div className="image-upload-wrapper">
                        {q.imageUrl && (
                          <div className="image-preview" style={{ marginBottom: '10px' }}>
                            <img src={`${getApiBaseUrl().replace('/api', '')}${q.imageUrl}`} alt="Question visual" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px' }} />
                            <button type="button" onClick={() => handleQuestionChange(qIdx, 'imageUrl', '')} style={{ marginLeft: '10px', color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}><i className="fas fa-trash"></i> Remove</button>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            try {
                              const token = localStorage.getItem('token');
                              const imgData = new FormData();
                              imgData.append('image', file);
                              const res = await axios.post(`${getApiBaseUrl()}/upload/image`, imgData, {
                                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                              });
                              if (res.data.success) {
                                handleQuestionChange(qIdx, 'imageUrl', res.data.url);
                              }
                            } catch (err) {
                              alert('Image upload failed');
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      {q.options.map((opt, optIdx) => (
                        <div key={opt.originalIndex} className="form-group" style={{ margin: 0 }}>
                          <label>Option {optIdx + 1} {Number(q.correctAnswer) === Number(opt.originalIndex) ? ' (Correct)' : ''}</label>
                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Correct Option</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => handleQuestionChange(qIdx, 'correctAnswer', Number(e.target.value))}
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
                
                <hr style={{ margin: '30px 0', borderColor: '#e2e8f0' }} />
                <h4>Coding Problems (Optional)</h4>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label>Select coding problems to include in this test</label>
                  <select 
                    multiple 
                    style={{ height: '120px' }}
                    value={formData.codingProblems}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, codingProblems: selected });
                    }}
                  >
                    {availableCodingProblems.map(prob => (
                      <option key={prob._id} value={prob._id}>
                        {prob.title} ({prob.difficulty})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>Hold Ctrl/Cmd to select multiple coding problems.</small>
                </div>

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
              // Map the generated questions to backend schema
              const formattedGeneratedData = generatedData.map(q => ({
                ...q,
                options: q.options.map((opt, i) => ({ originalIndex: i, text: opt })),
                correctAnswer: q.correctIndex
              }));

              const updatedFormData = {
                ...formData,
                questions: [...existingQuestions, ...formattedGeneratedData]
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
          <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ width: '90%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 8px 0' }}>Assessment Results</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>{selectedTest?.title}</p>
                </div>
                <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => setShowResultsModal(false)}>
                  <i className="fas fa-times"></i> Close
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>{testResults.totalAssigned}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Assigned</div>
                </div>
                <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb', marginBottom: '4px' }}>{testResults.totalCompleted}</div>
                  <div style={{ color: '#3b82f6', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Completed</div>
                </div>
                <div style={{ background: '#f5f3ff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', marginBottom: '4px' }}>{testResults.averageScore}</div>
                  <div style={{ color: '#8b5cf6', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Avg Score</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', marginBottom: '4px' }}>{testResults.passCount}</div>
                  <div style={{ color: '#22c55e', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Passed</div>
                </div>
                <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', marginBottom: '4px' }}>{testResults.failCount}</div>
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Failed</div>
                </div>
              </div>

              <h4 style={{ color: '#0f172a', fontSize: '1.3rem', marginBottom: '16px' }}>Candidate Performances</h4>
              {testResults.candidates.length === 0 ? (
                <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                  <i className="fas fa-users-slash" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: '16px' }}></i>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>No candidates have completed this test yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '16px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Candidate</th>
                        <th style={{ padding: '16px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Score</th>
                        <th style={{ padding: '16px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Status</th>
                        <th style={{ padding: '16px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Integrity</th>
                        <th style={{ padding: '16px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Submitted At</th>
                        <th style={{ padding: '16px', color: '#475569', fontWeight: 600, fontSize: '0.9rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.candidates.flatMap((candidate, index) => [
                        <tr key={`candidate-${candidate.attemptId}`} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{candidate.student?.name || 'Candidate'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{candidate.student?.email || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{candidate.totalScore} <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>/ {candidate.maxScore}</span></div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{candidate.percentage}%</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              padding: '6px 12px', 
                              borderRadius: '20px', 
                              fontSize: '0.8rem', 
                              fontWeight: 700,
                              backgroundColor: candidate.passed ? '#dcfce7' : '#fee2e2',
                              color: candidate.passed ? '#16a34a' : '#dc2626'
                            }}>
                              {candidate.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ 
                                width: '10px', 
                                height: '10px', 
                                borderRadius: '50%', 
                                backgroundColor: candidate.suspicious ? '#ef4444' : candidate.proctoringStatus === 'CLEAN' ? '#10b981' : '#f59e0b' 
                              }}></div>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                                  {candidate.suspicious ? 'Suspicious' : (candidate.proctoringStatus || 'Clean')}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  {candidate.violationsCount ?? 0} Violations (Score: {candidate.suspicionScore ?? 0})
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px', color: '#475569', fontSize: '0.9rem' }}>
                            {new Date(candidate.submittedAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn-secondary" 
                                style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }} 
                                onClick={() => handleReviewAttempt(candidate)}
                              >
                                <i className={`fas fa-chevron-${expandedAttemptId === candidate.attemptId ? 'up' : 'down'}`}></i> Review
                              </button>
                              <button 
                                className="btn-primary" 
                                style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px' }} 
                                onClick={async () => {
                                  try {
                                    const response = await api.get(`/aptitude/attempt/${candidate.attemptId}/pdf`, { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `Assessment_Report_${candidate.attemptId}.pdf`);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                    window.URL.revokeObjectURL(url);
                                  } catch (downloadError) {
                                    console.error(downloadError);
                                    alert('Failed to download PDF report');
                                  }
                                }}
                              >
                                <i className="fas fa-download"></i> PDF
                              </button>
                            </div>
                          </td>
                        </tr>,
                        expandedAttemptId === candidate.attemptId && (
                          <tr key={`review-${candidate.attemptId}`}>
                            <td colSpan="6" style={{ padding: 0 }}>
                              <div style={{ background: '#f8fafc', padding: '24px', borderBottom: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                  <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}><i className="fas fa-shield-alt" style={{ color: '#64748b', marginRight: '8px' }}></i> Security Timeline</h5>
                                  {candidate.suspicious && (
                                    <button 
                                      className="btn-secondary" 
                                      style={{ padding: '6px 16px', fontSize: '0.85rem', borderRadius: '20px', color: '#d97706', borderColor: '#fcd34d', backgroundColor: '#fffbeb' }} 
                                      onClick={async () => {
                                        if (!window.confirm('Are you sure you want to mark this candidate\'s attempt as a false alarm? This will reset their suspicion score.')) return;
                                        try {
                                          await api.post(`/aptitude/attempt/${candidate.attemptId}/false-alarm`);
                                          setTestResults(prev => ({
                                            ...prev,
                                            candidates: prev.candidates.map(c => 
                                              c.attemptId === candidate.attemptId ? { ...c, suspicious: false, suspicionScore: 0, proctoringStatus: 'CLEAN' } : c
                                            )
                                          }));
                                        } catch (err) {
                                          alert('Failed to mark as false alarm');
                                        }
                                      }}
                                    >
                                      <i className="fas fa-check-circle"></i> Mark as False Alarm
                                    </button>
                                  )}
                                </div>
                                
                                {(candidate.referencePhotoUrl || candidate.idCardPhotoUrl) && (
                                  <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    {candidate.referencePhotoUrl && (
                                      <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reference Photo</div>
                                        <img src={candidate.referencePhotoUrl} alt="Reference" style={{ width: '160px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                                      </div>
                                    )}
                                    {candidate.idCardPhotoUrl && (
                                      <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Card</div>
                                        <img src={candidate.idCardPhotoUrl} alt="ID Card" style={{ width: '160px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {candidate.securityTimeline?.length ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {candidate.securityTimeline.map(event => (
                                      <div key={event.id} style={{ display: 'flex', gap: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ minWidth: '140px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                          {new Date(event.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{event.type.replace(/_/g, ' ')} <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569', marginLeft: '8px' }}>{event.severity}</span></div>
                                          <div style={{ color: '#475569', fontSize: '0.95rem' }}>{event.message}</div>
                                        </div>
                                        {event.snapshotUrl && (
                                          <div style={{ width: '200px' }}>
                                            {snapshotImages[event.id] ? (
                                              <img src={snapshotImages[event.id]} alt={`Snapshot for ${event.type}`} style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} />
                                            ) : (
                                              <div style={{ width: '100%', height: '110px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Loading image...</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="fas fa-check-circle" style={{ fontSize: '1.2rem' }}></i>
                                    <strong>Clean Attempt!</strong> No security events or violations were recorded during this session.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      ])}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyAptitudeTests;
