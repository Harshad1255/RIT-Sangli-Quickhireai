import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../../config/api';
import '../styles/CreateScholasticQuestion.css'; // Let's create CSS for it

const API_BASE = `${getApiBaseUrl()}/scholastic/company`;

const CATEGORIES = [
  'Quantitative Aptitude',
  'Logical Reasoning',
  'Verbal Ability',
  'Data Interpretation',
  'General Scholastic',
  'Other'
];

const CreateScholasticQuestion = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    questionText: '',
    questionImageUrl: '',
    questionType: 'Multiple Choice',
    category: 'Quantitative Aptitude',
    subCategory: '',
    difficulty: 'Medium',
    options: [
      { id: 1, text: '' },
      { id: 2, text: '' },
      { id: 3, text: '' },
      { id: 4, text: '' }
    ],
    correctOptionId: 1,
    correctOptionIds: [],
    explanation: '',
    xp: 10,
    status: 'Draft',
    isPYQ: false,
    pyqMeta: {
      company: '',
      year: new Date().getFullYear(),
      round: ''
    }
  });

  useEffect(() => {
    if (id) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Using questions list API and filtering by ID since there is no get by id route
      const res = await axios.get(`${API_BASE}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const q = res.data.questions?.find(q => q._id === id);
      if (q) {
        setFormData({
          title: q.title || '',
          questionText: q.questionText || '',
          questionImageUrl: q.questionImageUrl || '',
          questionType: q.questionType || 'Multiple Choice',
          category: q.category || 'Quantitative Aptitude',
          subCategory: q.subCategory || '',
          difficulty: q.difficulty || 'Medium',
          options: q.options || [],
          correctOptionId: q.correctOptionId || null,
          correctOptionIds: q.correctOptionIds || [],
          explanation: q.explanation || '',
          xp: q.xp || 10,
          status: q.status || 'Draft',
          isPYQ: q.isPYQ || false,
          pyqMeta: q.pyqMeta || { company: '', year: new Date().getFullYear(), round: '' }
        });
      }
    } catch (err) {
      console.error('Error fetching question', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    let newOptions = [...formData.options];
    let newCorrectId = formData.correctOptionId;
    let newCorrectIds = [...formData.correctOptionIds];

    if (newType === 'True/False') {
      newOptions = [
        { id: 1, text: 'True' },
        { id: 2, text: 'False' }
      ];
      if (newCorrectId !== 1 && newCorrectId !== 2) newCorrectId = 1;
    } else if (newType === 'Multiple Choice') {
      if (newOptions.length < 2) {
        newOptions = [
          { id: 1, text: '' },
          { id: 2, text: '' },
          { id: 3, text: '' },
          { id: 4, text: '' }
        ];
      }
      if (!newCorrectId) newCorrectId = newOptions[0].id;
    }

    setFormData({
      ...formData,
      questionType: newType,
      options: newOptions,
      correctOptionId: newCorrectId,
      correctOptionIds: newCorrectIds
    });
  };

  const updateOptionText = (id, text) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(opt => opt.id === id ? { ...opt, text } : opt)
    }));
  };

  const addOption = () => {
    if (formData.options.length >= 8) return;
    const newId = formData.options.length > 0 ? Math.max(...formData.options.map(o => o.id)) + 1 : 1;
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { id: newId, text: '' }]
    }));
  };

  const removeOption = (id) => {
    if (formData.options.length <= 2) return;
    setFormData(prev => {
      const filtered = prev.options.filter(o => o.id !== id);
      let newCorrectId = prev.correctOptionId;
      if (newCorrectId === id) newCorrectId = filtered[0].id;
      return {
        ...prev,
        options: filtered,
        correctOptionId: newCorrectId,
        correctOptionIds: prev.correctOptionIds.filter(c => c !== id)
      };
    });
  };

  const handleCorrectSelection = (id) => {
    if (formData.questionType === 'Multiple Select') {
      setFormData(prev => {
        const ids = new Set(prev.correctOptionIds);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        return { ...prev, correctOptionIds: Array.from(ids) };
      });
    } else {
      setFormData({ ...formData, correctOptionId: id });
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setUploadingImage(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await axios.post(`${getApiBaseUrl()}/upload/image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data.success) {
        setFormData(prev => ({ ...prev, questionImageUrl: res.data.url }));
      }
    } catch (err) {
      console.error('Image upload failed', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim() || !formData.questionText.trim() || !formData.subCategory.trim()) return false;
    if (formData.questionType !== 'True/False' && formData.options.some(o => !o.text.trim())) return false;
    if (formData.questionType === 'Multiple Select' && formData.correctOptionIds.length === 0) return false;
    if (formData.questionType !== 'Multiple Select' && !formData.correctOptionId) return false;
    return true;
  };

  const handleSave = async (statusOverride) => {
    if (statusOverride === 'Published' && !validateForm()) {
      alert("Please fill all required fields before publishing.");
      return;
    }

    if (statusOverride === 'Published' && !window.confirm("Publish this question?\n\nOnce published, this question may become available in the selected Scholastic Practice test.")) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const payload = { ...formData, status: statusOverride || formData.status };

      if (id) {
        await axios.put(`${API_BASE}/questions/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE}/questions`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Toast logic can go here. For now, we navigate back.
      navigate('/company-dashboard/scholastic');
    } catch (err) {
      console.error('Save failed', err);
      alert(err.response?.data?.error || 'Error saving question');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading question...</div>;
  }

  return (
    <div className="create-question-page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/company-dashboard/scholastic')}>
            <i className="fas fa-arrow-left"></i> Back to Bank
          </button>
          <h2>{id ? 'Edit Question' : 'Create Scholastic Question'}</h2>
          <p>Create and publish questions for your company's scholastic practice tests.</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-draft" 
            onClick={() => handleSave('Draft')} 
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            className="btn-publish" 
            onClick={() => handleSave('Published')} 
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish Question'}
          </button>
        </div>
      </div>

      <div className="layout-grid">
        <div className="form-column">
          <div className="card">
            <h3>Question Configuration</h3>
            
            <div className="form-group">
              <label>Question Title <span className="req">*</span></label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="e.g., Simple Interest Basics" 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Question Type <span className="req">*</span></label>
                <select value={formData.questionType} onChange={handleTypeChange}>
                  <option value="Multiple Choice">Multiple Choice</option>
                  <option value="Multiple Select">Multiple Select</option>
                  <option value="True/False">True / False</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category <span className="req">*</span></label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Topic <span className="req">*</span></label>
                <input 
                  type="text" 
                  value={formData.subCategory} 
                  onChange={e => setFormData({...formData, subCategory: e.target.value})} 
                  placeholder="e.g., Percentages, Data Interpretation" 
                />
              </div>
              <div className="form-group">
                <label>Difficulty <span className="req">*</span></label>
                <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Marks (XP) <span className="req">*</span></label>
                <input 
                  type="number" 
                  min="1" 
                  value={formData.xp} 
                  onChange={e => setFormData({...formData, xp: Number(e.target.value)})} 
                />
              </div>
              <div className="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={formData.isPYQ} 
                    onChange={e => setFormData({...formData, isPYQ: e.target.checked})} 
                  /> Is Previous Year Question (PYQ)?
                </label>
              </div>
            </div>

            {formData.isPYQ && (
              <div className="form-row pyq-fields" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                <div className="form-group">
                  <label>Company</label>
                  <input 
                    type="text" 
                    value={formData.pyqMeta.company} 
                    onChange={e => setFormData({...formData, pyqMeta: {...formData.pyqMeta, company: e.target.value}})} 
                    placeholder="e.g. Google"
                  />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input 
                    type="number" 
                    value={formData.pyqMeta.year} 
                    onChange={e => setFormData({...formData, pyqMeta: {...formData.pyqMeta, year: Number(e.target.value)}})} 
                  />
                </div>
                <div className="form-group">
                  <label>Round</label>
                  <input 
                    type="text" 
                    value={formData.pyqMeta.round} 
                    onChange={e => setFormData({...formData, pyqMeta: {...formData.pyqMeta, round: e.target.value}})} 
                    placeholder="e.g. Online Assessment"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Question Editor</h3>
            
            <div className="form-group">
              <label>Question Text <span className="req">*</span></label>
              <textarea 
                rows={5} 
                value={formData.questionText} 
                onChange={e => setFormData({...formData, questionText: e.target.value})} 
                placeholder="Enter your question here..."
              ></textarea>
              <div className="char-count">{formData.questionText.length} characters</div>
            </div>

            <div className="form-group">
              <label>Question Image (Optional)</label>
              <div className="image-upload-wrapper">
                {formData.questionImageUrl && (
                  <div className="image-preview" style={{ marginBottom: '10px' }}>
                    <img src={`${getApiBaseUrl().replace('/api', '')}${formData.questionImageUrl}`} alt="Question visual" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                    <button type="button" onClick={() => setFormData({...formData, questionImageUrl: ''})} style={{ marginLeft: '10px', color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}><i className="fas fa-trash"></i> Remove</button>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={uploadingImage}
                />
                {uploadingImage && <span style={{ marginLeft: '10px' }}>Uploading...</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Answer Options <span className="req">*</span></label>
              <p className="helper-text">Select the correct answer{formData.questionType === 'Multiple Select' ? 's' : ''}. Students will not see which option is correct.</p>
              
              <div className="options-container">
                {formData.options.map((opt, index) => (
                  <div className={`option-row ${
                    (formData.questionType === 'Multiple Select' ? formData.correctOptionIds.includes(opt.id) : formData.correctOptionId === opt.id) ? 'is-correct' : ''
                  }`} key={opt.id}>
                    <div className="option-control">
                      {formData.questionType === 'Multiple Select' ? (
                        <input 
                          type="checkbox"
                          checked={formData.correctOptionIds.includes(opt.id)}
                          onChange={() => handleCorrectSelection(opt.id)}
                        />
                      ) : (
                        <input 
                          type="radio" 
                          name="correctOption" 
                          checked={formData.correctOptionId === opt.id} 
                          onChange={() => handleCorrectSelection(opt.id)}
                        />
                      )}
                    </div>
                    <div className="option-label">Option {String.fromCharCode(65 + index)}</div>
                    <input 
                      type="text"
                      className="option-input"
                      value={opt.text}
                      onChange={e => updateOptionText(opt.id, e.target.value)}
                      placeholder={`Enter option ${String.fromCharCode(65 + index)}...`}
                      disabled={formData.questionType === 'True/False'}
                    />
                    {formData.questionType !== 'True/False' && formData.options.length > 2 && (
                      <button className="del-btn" type="button" onClick={() => removeOption(opt.id)} title="Remove Option">
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {formData.questionType !== 'True/False' && formData.options.length < 8 && (
                <button type="button" className="add-option-btn" onClick={addOption}>
                  <i className="fas fa-plus"></i> Add Option
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Answer Explanation</label>
              <textarea 
                rows={3} 
                value={formData.explanation} 
                onChange={e => setFormData({...formData, explanation: e.target.value})}
                placeholder="Explain why the selected answer is correct..."
              ></textarea>
              <p className="helper-text">Provide an explanation to help students understand the correct answer.</p>
            </div>
          </div>
        </div>

        <div className="preview-column">
          <div className="card sticky">
            <div className="preview-header">
              <h3><i className="fas fa-desktop"></i> Student Preview</h3>
              <span className="badge">Student View</span>
            </div>
            
            <div className="preview-content">
              <div className="preview-meta">
                <span>{formData.category} &bull; {formData.subCategory || 'Topic'}</span>
                <span>{formData.xp} Marks</span>
              </div>
              
              <div className="preview-question">
                {formData.questionText || <span className="empty-ph">Question text will appear here...</span>}
              </div>
              
              {formData.questionImageUrl && (
                <div className="preview-image" style={{ margin: '15px 0' }}>
                  <img src={`${getApiBaseUrl().replace('/api', '')}${formData.questionImageUrl}`} alt="Question visual" style={{ maxWidth: '100%', borderRadius: '6px' }} />
                </div>
              )}
              
              <div className="preview-options">
                {formData.options.map((opt, index) => (
                  <div className="preview-opt" key={opt.id}>
                    <div className="opt-indicator">
                      {formData.questionType === 'Multiple Select' ? <i className="far fa-square"></i> : <i className="far fa-circle"></i>}
                    </div>
                    <div className="opt-letter">{String.fromCharCode(65 + index)}.</div>
                    <div className="opt-text">{opt.text || <span className="empty-ph">Option text</span>}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="preview-footer">
              <button disabled className="btn-secondary">Previous</button>
              <button disabled className="btn-primary">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateScholasticQuestion;
