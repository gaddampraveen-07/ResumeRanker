import React, { useState } from 'react';
import {
  User,
  Building,
  Mail,
  Shield,
  Save,
  Cpu,
  Database,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    company: user?.company || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const res = await authApi.updateProfile(formData);
      updateUser(res.data.user);
      setSaveSuccess('Recruiter profile updated successfully.');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setSeedStatus('');
    try {
      const res = await authApi.seedDemo();
      setSeedStatus(res.data.message || 'Demo data loaded successfully!');
    } catch (err) {
      setSeedStatus(err.response?.data?.message || 'Demo data seed failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.65rem', fontWeight: '800' }}>Settings & Recruiter Profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Manage your account details, review AI scoring mechanics, and check system service health.
        </p>
      </div>

      {/* Recruiter Profile Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--primary)" />
            <h3 className="card-title">Recruiter Profile Information</h3>
          </div>
        </div>

        {saveSuccess && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {saveSuccess}
          </div>
        )}

        {saveError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--rose-subtle)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#FDA4AF',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {saveError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Recruiter Full Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company / Organization</label>
              <input
                type="text"
                className="form-input"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Registered Email</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <p className="form-hint">Email address cannot be modified once verified.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save size={16} />
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* AI Scoring Engine Documentation Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--primary)" />
            <h3 className="card-title">Scoring Model & Formula Specification</h3>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '16px' }}>
          Resume Ranker calculates reproducible and explainable candidate match scores on a 0–100 scale using the following default weights (customizable per job):
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <strong>1. Required Skills Match (40% Weight):</strong> Exact and canonical match ratio of mandatory skills detected in resume.
            </div>
            <span className="badge badge-emerald">40%</span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <strong>2. Text Similarity (25% Weight):</strong> TF-IDF vectorization and cosine similarity between resume text and job description.
            </div>
            <span className="badge badge-indigo">25%</span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <strong>3. Preferred Skills Match (20% Weight):</strong> Bonus skills match ratio. If no preferred skills are specified in the job, this weight is automatically redistributed.
            </div>
            <span className="badge badge-indigo">20%</span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <strong>4. Relevant Experience Match (10% Weight):</strong> Evaluates inferable candidate professional tenure vs the minimum required experience.
            </div>
            <span className="badge badge-amber">10%</span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <strong>5. Educational Qualification (5% Weight):</strong> Verifies degree level (B.Tech, B.S., M.S., Ph.D.) against job qualifications.
            </div>
            <span className="badge badge-neutral">5%</span>
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            fontSize: '0.82rem',
            color: '#FDE68A',
          }}
        >
          <strong>Ethical AI Guardrail:</strong> The scoring engine strictly evaluates skills, qualifications, and experience. Personal attributes such as gender, age, photographs, ethnicity, religion, or contact details are explicitly excluded from scoring calculations.
        </div>
      </div>

      {/* Demo Data Seeder Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--primary)" />
            <h3 className="card-title">Turnkey Demonstration Data</h3>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '16px' }}>
          Want to test the full ranking pipeline, charts, and candidate comparison immediately? Load 2 pre-configured job openings with evaluated resumes and evidence snippets.
        </p>

        {seedStatus && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-subtle)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#A5B4FC',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {seedStatus}
          </div>
        )}

        <button
          onClick={handleSeedDemoData}
          disabled={seeding}
          className="btn btn-secondary"
        >
          <Sparkles size={16} color="var(--primary)" />
          {seeding ? 'Generating Sample Jobs & Candidates...' : 'Seed Sample Demo Data'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
