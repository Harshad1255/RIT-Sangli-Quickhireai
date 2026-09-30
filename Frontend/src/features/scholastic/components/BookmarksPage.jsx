import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';

const BookmarksPage = ({ setActiveSection }) => {
  const [filter, setFilter] = useState('All');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    notes: '',
    itemType: 'Aptitude',
    category: 'Quantitative Aptitude'
  });

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const res = await scholasticApi.getBookmarks();
      const items = Array.isArray(res?.data?.bookmarks) ? res.data.bookmarks : [];
      setBookmarks(items);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return 'Recently';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const normalizedBookmarks = bookmarks.map((bookmark) => {
    const itemType = bookmark.itemType === 'aptitude' ? 'Aptitude' : bookmark.itemType === 'coding' ? 'Coding' : 'Mock Test';
    const itemTitle = bookmark.notes || `${itemType} saved question`;
    const category = bookmark.itemType === 'aptitude' ? 'Quantitative Aptitude' : bookmark.itemType === 'coding' ? 'Programming Practice' : 'Mock Test';
    const difficulty = bookmark.itemType === 'mocktest' ? 'Mixed' : 'Medium';

    return {
      id: bookmark._id || bookmark.itemId,
      itemId: bookmark.itemId,
      itemType,
      type: itemType,
      title: itemTitle,
      category,
      difficulty,
      dateAdded: formatDate(bookmark.createdAt)
    };
  });

  const filtered = filter === 'All' ? normalizedBookmarks : normalizedBookmarks.filter(b => b.type === filter);

  const removeBookmark = async (bookmarkId, itemType, itemId) => {
    try {
      await scholasticApi.toggleBookmark({ itemType: itemType === 'Mock Test' ? 'mocktest' : itemType.toLowerCase(), itemId });
      setBookmarks(prev => prev.filter(b => (b._id || b.itemId) !== bookmarkId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const createBookmark = async (e) => {
    e.preventDefault();
    const itemType = draft.itemType === 'Mock Test' ? 'mocktest' : draft.itemType.toLowerCase();
    const itemId = `custom-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    try {
      const payload = {
        itemType,
        itemId,
        notes: draft.notes || draft.title || `${draft.itemType} saved bookmark`
      };
      const res = await scholasticApi.toggleBookmark(payload);
      if (res?.data?.success) {
        await fetchBookmarks();
        setDraft({ title: '', notes: '', itemType: 'Aptitude', category: 'Quantitative Aptitude' });
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating bookmark:', error);
    }
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.7rem 1rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i>
            Create Bookmark
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px' }}>
            {['All', 'Aptitude', 'Coding', 'Mock Test'].map(t => (
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
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>Loading bookmarks...</div>
      ) : filtered.length === 0 ? (
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
                  <i className={`fas ${b.type === 'Aptitude' ? 'fa-brain' : b.type === 'Coding' ? 'fa-code' : 'fa-clipboard-check'}`}></i>
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
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Saved {b.dateAdded}</span>
                <button
                  onClick={() => setActiveSection(b.type === 'Aptitude' ? 'scholastic-aptitude' : b.type === 'Coding' ? 'scholastic-coding' : 'scholastic-mocktests')}
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
                  onClick={() => removeBookmark(b.id, b.type, b.itemId)}
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

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: '520px', background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Create Bookmark</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={createBookmark}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 600, color: '#334155' }}>Bookmark Type</label>
                  <select value={draft.itemType} onChange={(e) => setDraft({ ...draft, itemType: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <option>Aptitude</option>
                    <option>Coding</option>
                    <option>Mock Test</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 600, color: '#334155' }}>Title</label>
                  <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Probability Basics" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }} required />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 600, color: '#334155' }}>Category</label>
                  <input type="text" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. Quantitative Aptitude" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 600, color: '#334155' }}>Notes</label>
                  <textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional reminder or revision note" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;
