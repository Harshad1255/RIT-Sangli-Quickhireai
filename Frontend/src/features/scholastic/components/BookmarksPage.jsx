import React, { useState } from 'react';

const BookmarksPage = ({ setActiveSection }) => {
  const [filter, setFilter] = useState('All');

  const [bookmarks, setBookmarks] = useState([
    {
      id: 'b1',
      title: 'Probability of selecting 2 red balls from a bag of 5 red and 3 blue balls',
      type: 'Aptitude',
      category: 'Quantitative Aptitude',
      difficulty: 'Medium',
      dateAdded: '2 days ago'
    },
    {
      id: 'b2',
      title: 'Find Longest Palindromic Substring in O(N^2) time',
      type: 'Coding',
      category: 'Dynamic Programming',
      difficulty: 'Medium',
      dateAdded: '4 days ago'
    },
    {
      id: 'b3',
      title: 'Seating arrangement of 8 executives around a circular table with restrictions',
      type: 'Aptitude',
      category: 'Logical Reasoning',
      difficulty: 'Hard',
      dateAdded: '1 week ago'
    },
    {
      id: 'b4',
      title: 'Detect cycle in a directed graph using Kahn\'s topological sort',
      type: 'Coding',
      category: 'Graphs',
      difficulty: 'Hard',
      dateAdded: '1 week ago'
    }
  ]);

  const filtered = filter === 'All' ? bookmarks : bookmarks.filter(b => b.type === filter);

  const removeBookmark = (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
            Bookmarked Questions & Revision List
          </h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            Review your saved placement aptitude questions and algorithmic problems before your technical interviews.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px' }}>
          {['All', 'Aptitude', 'Coding'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: filter === t ? '#ffffff' : 'transparent',
                color: filter === t ? '#0f172a' : '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: filter === t ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <i className="fas fa-bookmark fa-2x" style={{ color: '#cbd5e1' }}></i>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>No bookmarked questions in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(b => (
            <div
              key={b.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: b.type === 'Aptitude' ? '#ecfdf5' : '#eff6ff',
                  color: b.type === 'Aptitude' ? '#10b981' : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  <i className={`fas ${b.type === 'Aptitude' ? 'fa-brain' : 'fa-code'}`}></i>
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      {b.category}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      background: b.difficulty === 'Hard' ? '#fee2e2' : b.difficulty === 'Medium' ? '#fef9c3' : '#dcfce7',
                      color: b.difficulty === 'Hard' ? '#991b1b' : b.difficulty === 'Medium' ? '#854d0e' : '#166534'
                    }}>
                      {b.difficulty}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                    {b.title}
                  </h4>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Added {b.dateAdded}</span>
                <button
                  onClick={() => setActiveSection(b.type === 'Aptitude' ? 'scholastic-aptitude' : 'scholastic-coding')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Solve Again
                </button>
                <button
                  onClick={() => removeBookmark(b.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '0.5rem'
                  }}
                  title="Remove bookmark"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;
