import React, { useState, useEffect } from 'react';
import scholasticApi from '../services/scholasticApi';

const ProfilePage = () => {
  const [stats, setStats] = useState({ xp: 350, coins: 120, level: 2 });
  const [profile, setProfile] = useState({
    name: 'Aarav Sharma',
    email: 'aarav.sharma@university.edu.in',
    university: 'Indian Institute of Technology / NIT',
    degree: 'B.Tech Computer Science & Engineering',
    graduationYear: '2026',
    targetCompanies: ['Google', 'Microsoft', 'TCS NQT', 'Amazon'],
    githubUsername: 'aarav-codes',
    leetcodeUsername: 'aarav_sharma',
    rating: 1420
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await scholasticApi.getProgress();
      if (res.data && res.data.success) {
        setStats(res.data.stats || { xp: 350, coins: 120, level: 2 });
      }
    } catch (err) {
      console.error('Error fetching profile stats:', err);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
    // Persisted to UI state
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
            Scholastic Profile & Placement Resume
          </h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            Manage your university affiliation, target placement companies, and competitive programming profiles.
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            background: isEditing ? '#f1f5f9' : '#0f172a',
            color: isEditing ? '#0f172a' : '#ffffff',
            border: 'none',
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <i className={`fas fa-${isEditing ? 'times' : 'edit'}`}></i>
          <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Column: Avatar & Quick Stats */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 4px 15px -3px rgba(0,0,0,0.03)',
          height: 'fit-content'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: 800,
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.4)'
          }}>
            {profile.name[0].toUpperCase()}
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#0f172a' }}>
            {profile.name}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
            {profile.university}
          </p>

          <div style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
            Verified Student
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a' }}>{stats.xp}</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>XP Points</span>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a' }}>{stats.level}</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Level</span>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '1.25rem', color: '#0f172a' }}>{profile.rating}</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rating</span>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info / Form */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '2rem',
          boxShadow: '0 4px 15px -3px rgba(0,0,0,0.03)'
        }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem 0', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            Academic & Placement Details
          </h4>

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  disabled={!isEditing}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  University Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled={true}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  University / Institute Name
                </label>
                <input
                  type="text"
                  value={profile.university}
                  disabled={!isEditing}
                  onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Degree & Major
                </label>
                <input
                  type="text"
                  value={profile.degree}
                  disabled={!isEditing}
                  onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Expected Graduation Year
                </label>
                <input
                  type="text"
                  value={profile.graduationYear}
                  disabled={!isEditing}
                  onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Target Companies (comma separated)
                </label>
                <input
                  type="text"
                  value={profile.targetCompanies.join(', ')}
                  disabled={!isEditing}
                  onChange={(e) => setProfile({ ...profile, targetCompanies: e.target.value.split(',').map(s => s.trim()) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: isEditing ? '#ffffff' : '#f8fafc', color: '#0f172a' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>
                Your Target Placement Badges:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {profile.targetCompanies.map((comp, idx) => (
                  <span key={idx} style={{ background: '#f1f5f9', color: '#334155', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                    <i className="fas fa-building" style={{ marginRight: '6px', color: '#3b82f6' }}></i>
                    {comp}
                  </span>
                ))}
              </div>
            </div>

            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.75rem 1.75rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
