import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Briefcase, Sliders, Check, ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { jobApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const JobFormPage = () => {
  const { jobId } = useParams();
  const isEdit = !!jobId;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    department: 'Engineering',
    description: '',
    requiredSkills: '',
    preferredSkills: '',
    qualifications: '',
    minimumExperience: 2,
    preferredExperience: 4,
    employmentType: 'Full-time',
    location: 'Remote',
    status: 'Active',
    shortlistThreshold: 80,
    weights: {
      requiredSkills: 40,
      preferredSkills: 20,
      textSimilarity: 25,
      experience: 10,
      qualification: 5,
    },
  });

  useEffect(() => {
    if (isEdit) {
      const fetchJob = async () => {
        try {
          const res = await jobApi.getJob(jobId);
          const job = res.data.job;
          setFormData({
            title: job.title || '',
            company: job.company || '',
            department: job.department || 'Engineering',
            description: job.description || '',
            requiredSkills: (job.requiredSkills || []).join(', '),
            preferredSkills: (job.preferredSkills || []).join(', '),
            qualifications: (job.qualifications || []).join(', '),
            minimumExperience: job.minimumExperience ?? 2,
            preferredExperience: job.preferredExperience ?? 4,
            employmentType: job.employmentType || 'Full-time',
            location: job.location || 'Remote',
            status: job.status || 'Active',
            shortlistThreshold: job.shortlistThreshold ?? 80,
            weights: job.scoringConfiguration?.weights || {
              requiredSkills: 40,
              preferredSkills: 20,
              textSimilarity: 25,
              experience: 10,
              qualification: 5,
            },
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load job details');
        } finally {
          setLoading(false);
        }
      };
      fetchJob();
    }
  }, [jobId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWeightChange = (key, val) => {
    const numeric = Math.max(0, Math.min(100, Number(val) || 0));
    setFormData((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: numeric,
      },
    }));
  };

  const weightsSum = Object.values(formData.weights).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.company || !formData.description) {
      setError('Please provide Job Title, Company Name, and Job Description.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        company: formData.company,
        department: formData.department,
        description: formData.description,
        requiredSkills: formData.requiredSkills,
        preferredSkills: formData.preferredSkills,
        qualifications: formData.qualifications,
        minimumExperience: Number(formData.minimumExperience) || 0,
        preferredExperience: Number(formData.preferredExperience) || 0,
        employmentType: formData.employmentType,
        location: formData.location,
        status: formData.status,
        shortlistThreshold: Number(formData.shortlistThreshold) || 80,
        scoringConfiguration: {
          weights: formData.weights,
        },
      };

      if (isEdit) {
        await jobApi.updateJob(jobId, payload);
      } else {
        await jobApi.createJob(payload);
      }
      navigate('/jobs');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading job description configuration..." />;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          to="/jobs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-tertiary)',
            fontSize: '0.85rem',
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} /> Back to Job Positions
        </Link>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>
          {isEdit ? 'Edit Job Description' : 'Create New Job Description'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Define the technical requirements, preferred qualifications, and AI scoring weights.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--rose-subtle)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#FDA4AF',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Core Job Details */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Role Information</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Job Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g. Senior Full-Stack Engineer"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input
                type="text"
                name="company"
                className="form-input"
                placeholder="e.g. CloudScale Systems"
                value={formData.company}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                name="department"
                className="form-select"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="Engineering">Engineering</option>
                <option value="Data & AI">Data & AI</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="DevOps & Cloud">DevOps & Cloud</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select
                name="employmentType"
                className="form-select"
                value={formData.employmentType}
                onChange={handleChange}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                name="location"
                className="form-input"
                placeholder="e.g. Remote (US) or San Francisco"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Job Description *</label>
            <textarea
              name="description"
              className="form-textarea"
              placeholder="Provide a detailed job description including key responsibilities, role context, and tech stack details..."
              value={formData.description}
              onChange={handleChange}
              rows={6}
              required
            />
            <p className="form-hint">
              Used directly by the TF-IDF and Cosine Similarity engine to calculate semantic alignment.
            </p>
          </div>
        </div>

        {/* Candidate Criteria & Skills */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Skills & Experience Criteria</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills (Comma-separated)</label>
            <input
              type="text"
              name="requiredSkills"
              className="form-input"
              placeholder="e.g. React.js, Node.js, JavaScript, MongoDB, REST APIs"
              value={formData.requiredSkills}
              onChange={handleChange}
            />
            <p className="form-hint">
              Critical skills tested against candidate resumes. Weighted heavily in match calculations.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Skills (Comma-separated)</label>
            <input
              type="text"
              name="preferredSkills"
              className="form-input"
              placeholder="e.g. Docker, TypeScript, Kubernetes, AWS, GraphQL"
              value={formData.preferredSkills}
              onChange={handleChange}
            />
            <p className="form-hint">Bonus or good-to-have competencies.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Minimum Experience (Years)</label>
              <input
                type="number"
                name="minimumExperience"
                className="form-input"
                min="0"
                step="0.5"
                value={formData.minimumExperience}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Experience (Years)</label>
              <input
                type="number"
                name="preferredExperience"
                className="form-input"
                min="0"
                step="0.5"
                value={formData.preferredExperience}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Required Qualifications / Degrees</label>
            <input
              type="text"
              name="qualifications"
              className="form-input"
              placeholder="e.g. Bachelor's Degree, Master's Degree, B.Tech, Computer Science"
              value={formData.qualifications}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Configurable AI Scoring Weights */}
        <div className="card" style={{ marginBottom: '28px' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">AI Matching Scoring Weights</h3>
              <p className="card-subtitle">
                Customize relative importance for this specific opening. All scores normalize to a 0–100 scale.
              </p>
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: weightsSum === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: weightsSum === 100 ? '#34D399' : '#FBBF24',
              }}
            >
              Total Weight: {weightsSum}% {weightsSum === 100 ? '✓' : '(Auto-normalized)'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Required Skills ({formData.weights.requiredSkills}%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={formData.weights.requiredSkills}
                onChange={(e) => handleWeightChange('requiredSkills', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Preferred Skills ({formData.weights.preferredSkills}%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={formData.weights.preferredSkills}
                onChange={(e) => handleWeightChange('preferredSkills', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Text Similarity ({formData.weights.textSimilarity}%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={formData.weights.textSimilarity}
                onChange={(e) => handleWeightChange('textSimilarity', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Experience ({formData.weights.experience}%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={formData.weights.experience}
                onChange={(e) => handleWeightChange('experience', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Qualification ({formData.weights.qualification}%)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={formData.weights.qualification}
                onChange={(e) => handleWeightChange('qualification', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Shortlist Qualification Threshold */}
        <div className="card" style={{ marginBottom: '28px' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Shortlist Match Score Threshold (%)</h3>
              <p className="card-subtitle">
                Set the minimum match score required for students/candidates to be eligible for shortlisting.
              </p>
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Shortlist Cutoff: {formData.shortlistThreshold}%
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Quick Presets:</span>
              {[70, 75, 80, 85, 90].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setFormData((prev) => ({ ...prev, shortlistThreshold: val }))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    backgroundColor:
                      Number(formData.shortlistThreshold) === val
                        ? 'var(--primary)'
                        : 'rgba(255, 255, 255, 0.05)',
                    color: Number(formData.shortlistThreshold) === val ? '#FFF' : 'var(--text-secondary)',
                    border: `1px solid ${
                      Number(formData.shortlistThreshold) === val
                        ? 'var(--primary)'
                        : 'var(--border-subtle)'
                    }`,
                  }}
                >
                  {val}% {val === 80 ? '(Standard)' : ''}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', alignItems: 'center' }}>
              <div>
                <label className="form-label">Custom Threshold (%)</label>
                <input
                  type="number"
                  name="shortlistThreshold"
                  className="form-input"
                  min="0"
                  max="100"
                  value={formData.shortlistThreshold}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    setFormData((prev) => ({ ...prev, shortlistThreshold: val }));
                  }}
                  required
                />
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginTop: '16px',
                }}
              >
                <strong style={{ color: '#34D399' }}>Shortlisting Rule:</strong> Only students or candidates scoring{' '}
                <strong style={{ color: '#FFF' }}>{formData.shortlistThreshold}% or higher</strong> will be eligible for shortlisting. Anyone below this percentage cannot be marked as Shortlisted by recruiters.
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/jobs')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting}
          >
            <Save size={18} />
            {submitting ? 'Saving...' : isEdit ? 'Update Job Description' : 'Publish Job Opening'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobFormPage;
