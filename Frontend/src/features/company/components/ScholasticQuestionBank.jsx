import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../../config/api.js';

const API_BASE = `${getApiBaseUrl()}/scholastic/company`;

const ScholasticQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Error fetching questions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? Archiving may occur if used in a set.")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchQuestions();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/questions/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.error || `Unable to ${action} question.`);
    }
  };

  return (
    <div>
      <div className="list-header">
        <div>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Question Bank</h3>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Drafts stay private. Publish when the question is ready for students.</p>
        </div>
        <button className="action-btn" onClick={() => navigate('/company-dashboard/scholastic/create-question')}>
          <i className="fas fa-plus"></i> Create Question
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-box-open"></i>
          <h3>No Scholastic Aptitude questions yet</h3>
          <p>Create questions to add them to your practice sets.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Status</th>
              <th>Performance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(q => (
              <tr key={q._id}>
                <td style={{ fontWeight: 500, color: '#0f172a' }}>{q.title}</td>
                <td>{q.category}</td>
                <td>
                  <span style={{ 
                    color: q.difficulty === 'Easy' ? '#16a34a' : q.difficulty === 'Medium' ? '#ea580c' : '#dc2626'
                  }}>
                    {q.difficulty}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${q.status.toLowerCase()}`}>
                    {q.status}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>
                    Att: {q.totalAttempts} | Acc: {q.accuracy}%
                  </div>
                </td>
                <td>
                  <button style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', marginRight: 10 }} onClick={() => setPreviewQuestion(q)}>
                    <i className="fas fa-eye"></i> View
                  </button>
                  <button style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: 10 }} onClick={() => navigate(`/company-dashboard/scholastic/edit-question/${q._id}`)}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  {q.status === 'Published' ? (
                    <button style={{ background: 'transparent', border: 'none', color: '#ca8a04', cursor: 'pointer', marginRight: 10 }} onClick={() => handleAction(q._id, 'unpublish')}>
                      <i className="fas fa-eye-slash"></i> Unpublish
                    </button>
                  ) : q.status !== 'Archived' ? (
                    <button style={{ background: 'transparent', border: 'none', color: '#16a34a', cursor: 'pointer', marginRight: 10 }} onClick={() => handleAction(q._id, 'publish')}>
                      <i className="fas fa-upload"></i> Publish
                    </button>
                  ) : null}
                  <button style={{ background: 'transparent', border: 'none', color: '#7c3aed', cursor: 'pointer', marginRight: 10 }} onClick={() => handleAction(q._id, 'duplicate')}>
                    <i className="fas fa-copy"></i> Duplicate
                  </button>
                  {q.status !== 'Archived' && (
                    <button style={{ background: 'transparent', border: 'none', color: '#b45309', cursor: 'pointer', marginRight: 10 }} onClick={() => handleAction(q._id, 'archive')}>
                      <i className="fas fa-archive"></i> Archive
                    </button>
                  )}
                  <button style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }} onClick={() => handleDelete(q._id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}



      {previewQuestion && (
        <div className="modal-overlay" onClick={(event) => { if (event.target.className === 'modal-overlay') setPreviewQuestion(null); }}>
          <div className="modal-content">
            <h3>{previewQuestion.title}</h3>
            <p>{previewQuestion.questionText}</p>
            {previewQuestion.options?.map(option => {
              const isCorrect = previewQuestion.questionType === 'Multiple Select' 
                ? previewQuestion.correctOptionIds?.includes(option.id)
                : option.id === previewQuestion.correctOptionId;
              return (
              <div key={option.id} style={{ padding: '10px', marginBottom: 8, border: isCorrect ? '2px solid #16a34a' : '1px solid #e2e8f0', borderRadius: 6 }}>
                {option.text}{isCorrect ? ' (Correct answer)' : ''}
              </div>
            )})}
            <p><strong>Category:</strong> {previewQuestion.category} | <strong>Topic:</strong> {previewQuestion.subCategory} | <strong>Difficulty:</strong> {previewQuestion.difficulty}</p>
            <p><strong>Explanation:</strong> {previewQuestion.explanation || 'No explanation provided.'}</p>
            <button type="button" onClick={() => setPreviewQuestion(null)} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 6, background: 'white', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholasticQuestionBank;
