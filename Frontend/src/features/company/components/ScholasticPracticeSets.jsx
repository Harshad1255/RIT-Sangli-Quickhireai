import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../../../config/api.js';

const API_BASE = `${getApiBaseUrl()}/scholastic/company`;

const ScholasticPracticeSets = () => {
  const [sets, setSets] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Quantitative Aptitude',
    difficulty: 'Medium',
    timeLimitMinutes: 0,
    xpReward: 50,
    status: 'Draft',
    questions: [] // Array of question IDs
  });

  useEffect(() => {
    fetchSets();
    fetchAvailableQuestions();
  }, []);

  const fetchSets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/practice-sets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSets(res.data.practiceSets || []);
    } catch (err) {
      console.error('Error fetching sets', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Only show Published questions in the selection list
      setAvailableQuestions(res.data.questions.filter(q => q.status === 'Published') || []);
    } catch (err) {
      console.error('Error fetching questions', err);
    }
  };

  const handleOpenModal = (s = null) => {
    if (s) {
      setEditingId(s._id);
      setFormData({
        title: s.title || '',
        description: s.description || '',
        category: s.category || 'Quantitative Aptitude',
        difficulty: s.difficulty || 'Medium',
        timeLimitMinutes: s.timeLimitMinutes || 0,
        xpReward: s.xpReward || 50,
        status: s.status || 'Draft',
        questions: s.questions.map(q => q._id) // Map back to just IDs
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        category: 'Quantitative Aptitude',
        difficulty: 'Medium',
        timeLimitMinutes: 0,
        xpReward: 50,
        status: 'Draft',
        questions: []
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.questions.length === 0) {
      alert("Please select at least one question for the practice set.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.put(`${API_BASE}/practice-sets/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE}/practice-sets`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      fetchSets();
    } catch (err) {
      console.error('Save failed', err);
      alert('Error saving practice set');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? Sets with existing attempts will be archived instead of deleted.")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/practice-sets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSets();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/practice-sets/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSets();
    } catch (err) {
      alert(err.response?.data?.error || `Unable to ${action} practice set.`);
    }
  };

  const toggleQuestionSelection = (questionId) => {
    setFormData(prev => {
      const isSelected = prev.questions.includes(questionId);
      if (isSelected) {
        return { ...prev, questions: prev.questions.filter(id => id !== questionId) };
      } else {
        return { ...prev, questions: [...prev.questions, questionId] };
      }
    });
  };

  return (
    <div>
      <div className="list-header">
        <div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Practice Sets</h3>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Students can only attempt sets that are published by the company.</p>
        </div>
        <button className="action-btn" onClick={() => handleOpenModal()}>
          <i className="fas fa-plus"></i> Create Practice Set
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Loading practice sets...</div>
      ) : sets.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-layer-group"></i>
          <h3>No Practice Sets</h3>
          <p>Create bundles of questions to publish to the Student Hub.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Questions</th>
              <th>Status</th>
              <th>Engagement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sets.map(s => (
              <tr key={s._id}>
                <td style={{ fontWeight: 500, color: '#0f172a' }}>
                  {s.title}
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>
                    {s.timeLimitMinutes > 0 ? `${s.timeLimitMinutes} mins` : 'No Time Limit'} | {s.xpReward} XP
                  </div>
                </td>
                <td>{s.category}</td>
                <td>{s.questions?.length || 0}</td>
                <td>
                  <span className={`status-badge ${s.status.toLowerCase()}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>
                    Att: {s.totalAttempts} | Avg: {s.averageScore.toFixed(1)} pts
                  </div>
                </td>
                <td>
                  <button style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: 10 }} onClick={() => handleOpenModal(s)}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  {s.status === 'Published' ? (
                    <button style={{ background: 'transparent', border: 'none', color: '#ca8a04', cursor: 'pointer', marginRight: 10 }} onClick={() => handleAction(s._id, 'unpublish')}>
                      <i className="fas fa-eye-slash"></i> Unpublish
                    </button>
                  ) : s.status !== 'Archived' ? (
                    <button style={{ background: 'transparent', border: 'none', color: '#16a34a', cursor: 'pointer', marginRight: 10 }} onClick={() => handleAction(s._id, 'publish')}>
                      <i className="fas fa-upload"></i> Publish
                    </button>
                  ) : null}
                  {s.status !== 'Archived' && (
                    <button style={{ background: 'transparent', border: 'none', color: '#b45309', cursor: 'pointer', marginRight: 10 }} onClick={() => handleAction(s._id, 'archive')}>
                      <i className="fas fa-archive"></i> Archive
                    </button>
                  )}
                  <button style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }} onClick={() => handleDelete(s._id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Practice Set' : 'Create Practice Set'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', gap: 24 }}>
                {/* Left Col: Details */}
                <div style={{ flex: 1 }}>
                  <div className="form-group">
                    <label>Set Title</label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Placement Prep Mock 1" />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What is this practice set about?"></textarea>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Category</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                        <option value="Logical Reasoning">Logical Reasoning</option>
                        <option value="Verbal Ability">Verbal Ability</option>
                        <option value="Mixed Assessment">Mixed Assessment</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Difficulty</label>
                      <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Time Limit (Mins, 0 for none)</label>
                      <input type="number" value={formData.timeLimitMinutes} onChange={e => setFormData({...formData, timeLimitMinutes: Number(e.target.value)})} />
                    </div>
                    <div className="form-group">
                      <label>Total XP Reward</label>
                      <input type="number" value={formData.xpReward} onChange={e => setFormData({...formData, xpReward: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Draft">Draft (Hidden)</option>
                      <option value="Published">Published (Visible in Student Hub)</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Right Col: Question Selection */}
                <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', paddingLeft: 24, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#334155' }}>
                    Select Questions ({formData.questions.length} selected)
                  </label>
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', border: '1px solid #cbd5e1', borderRadius: 6, padding: 10, background: '#f8fafc' }}>
                    {availableQuestions.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginTop: 20 }}>
                        No published questions available.<br/>Go to Question Bank and publish some first!
                      </p>
                    ) : (
                      availableQuestions.map(q => (
                        <div key={q._id} style={{ 
                          padding: '10px', 
                          background: 'white', 
                          marginBottom: 8, 
                          borderRadius: 6,
                          border: formData.questions.includes(q._id) ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          cursor: 'pointer'
                        }} onClick={() => toggleQuestionSelection(q._id)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#0f172a' }}>{q.title}</div>
                            <input 
                              type="checkbox" 
                              checked={formData.questions.includes(q._id)} 
                              readOnly 
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                            {q.category} • {q.difficulty}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 6, background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save Practice Set</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholasticPracticeSets;
