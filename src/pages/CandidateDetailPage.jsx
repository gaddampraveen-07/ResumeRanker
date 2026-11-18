import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Save,
  MessageSquare,
  Award,
  Layers,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
import { rankingApi, resumeApi } from '../services/api';
import ScoreBadge from '../components/common/ScoreBadge';
import ReviewBadge from '../components/common/ReviewBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CandidateReviewModal from '../components/common/CandidateReviewModal';

const CandidateDetailPage = () => {
  const { jobId, candidateId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reviewStatus, setReviewStatus] = useState('Awaiting Review');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const res = await rankingApi.getCandidateAnalysis(jobId, candidateId);
        setData(res.data);
        setReviewStatus(res.data.candidate.reviewStatus || 'Awaiting Review');
        setNotes(res.data.candidate.recruiterNotes || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load candidate analysis');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [jobId, candidateId]);

  const handleStatusUpdate = async (newStatus) => {
    const threshold = data?.job?.shortlistThreshold ?? 80;
    const candScore = data?.candidate?.overallScore ?? 0;

    if (newStatus === 'Shortlisted' && candScore < threshold) {
      alert(
        `Candidate cannot be shortlisted: match score (${candScore}%) is below the recruiter shortlist threshold (${threshold}%).`
      );
      return;
    }

    try {
      await rankingApi.updateReviewStatus(candidateId, newStatus);
      setReviewStatus(newStatus);
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      setNoteSuccess('');
      await rankingApi.addRecruiterNote(candidateId, notes);
      setNoteSuccess('Recruiter notes saved successfully.');
      setTimeout(() => setNoteSuccess(''), 3000);
    } catch (err) {
      alert('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Extracting NLP evidence snippets and scoring breakdown..." />;
  }

  if (error || !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: '#F87171', marginBottom: '8px' }}>Unable to load candidate profile</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error || 'Record not found'}</p>
        <Link to={`/jobs/${jobId}/rankings`} className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Rankings
        </Link>
      </div>
    );
  }

  const { job, candidate } = data;
  const comp = candidate.componentScores || {};
  const weights = candidate.weightsUsed || {};

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back button and quick actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <Link
          to={`/jobs/${jobId}/rankings`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-tertiary)',
            fontSize: '0.88rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Candidate Rankings
        </Link>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowReviewModal(true)}
            className="btn btn-primary btn-sm"
          >
            <UserCheck size={15} />
            Review Candidate
          </button>
          {candidate.resumeId && (
            <a
              href={resumeApi.getDownloadUrl(candidate.resumeId)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <Download size={15} />
              Original Resume
            </a>
          )}
        </div>
      </div>

      {/* Candidate Hero Card */}
      <div className="card" style={{ marginBottom: '24px', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: '700',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)',
              }}
            >
              {candidate.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>{candidate.name}</h2>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    color: 'var(--primary)',
                    background: 'var(--primary-subtle)',
                    padding: '3px 9px',
                    borderRadius: '6px',
                  }}
                >
                  Rank #{candidate.rank}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '6px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={14} color="var(--text-tertiary)" />
                  {candidate.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={14} color="var(--text-tertiary)" />
                  {candidate.phone}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Briefcase size={14} color="var(--text-tertiary)" />
                  {candidate.yearsOfExperience !== null && candidate.yearsOfExperience !== undefined
                    ? `${candidate.yearsOfExperience} yrs experience`
                    : 'Experience not stated'}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Match Score Badge */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Overall Match Score
            </div>
            <ScoreBadge score={candidate.overallScore} size="lg" />
          </div>
        </div>

        {/* Recruiter Status Bar */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review Decision:</span>
            <ReviewBadge status={reviewStatus} />
            <button
              onClick={() => setShowReviewModal(true)}
              className="btn btn-primary btn-sm"
              style={{ marginLeft: '4px' }}
            >
              <UserCheck size={14} />
              Review Candidate
            </button>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
              {['Awaiting Review', 'Shortlisted', 'Under Review', 'Not Selected'].map((status) => {
                const threshold = data?.job?.shortlistThreshold ?? 80;
                const candScore = data?.candidate?.overallScore ?? 0;
                const isShortlistDisabled = status === 'Shortlisted' && candScore < threshold;

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    disabled={isShortlistDisabled}
                    title={
                      isShortlistDisabled
                        ? `Shortlisting requires match score ≥ ${threshold}% (Candidate: ${candScore}%)`
                        : status
                    }
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      transition: 'all 0.15s',
                      backgroundColor: reviewStatus === status ? 'var(--primary)' : 'var(--bg-input)',
                      color: reviewStatus === status ? '#FFF' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      opacity: isShortlistDisabled ? 0.4 : 1,
                      cursor: isShortlistDisabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Target: {job?.title} ({job?.company})
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left Column: Scoring Components Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Explainable Scoring Breakdown</h3>
              <p className="card-subtitle">Transparent weighted scoring formula components</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Required Skills */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>
                  Required Skills Match ({weights.requiredSkills || 40}% weight)
                </span>
                <span style={{ color: comp.requiredSkills >= 80 ? '#34D399' : '#FBBF24', fontWeight: '700' }}>
                  {comp.requiredSkills || 0}%
                </span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${comp.requiredSkills || 0}%`,
                    backgroundColor: comp.requiredSkills >= 80 ? '#10B981' : '#F59E0B',
                  }}
                />
              </div>
            </div>

            {/* Preferred Skills */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>
                  Preferred Skills Match ({weights.preferredSkills || 20}% weight)
                </span>
                <span style={{ color: comp.preferredSkills >= 80 ? '#34D399' : '#FBBF24', fontWeight: '700' }}>
                  {comp.preferredSkills || 0}%
                </span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${comp.preferredSkills || 0}%`,
                    backgroundColor: '#6366F1',
                  }}
                />
              </div>
            </div>

            {/* Text Similarity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>
                  TF-IDF Semantic Similarity ({weights.textSimilarity || 25}% weight)
                </span>
                <span style={{ color: '#06B6D4', fontWeight: '700' }}>
                  {comp.textSimilarity || 0}%
                </span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${comp.textSimilarity || 0}%`,
                    backgroundColor: '#06B6D4',
                  }}
                />
              </div>
            </div>

            {/* Experience */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>
                  Relevant Experience Match ({weights.experience || 10}% weight)
                </span>
                <span style={{ color: comp.experience >= 80 ? '#34D399' : '#FBBF24', fontWeight: '700' }}>
                  {comp.experience || 0}%
                </span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${comp.experience || 0}%`,
                    backgroundColor: '#8B5CF6',
                  }}
                />
              </div>
            </div>

            {/* Qualification */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>
                  Educational Qualification Match ({weights.qualification || 5}% weight)
                </span>
                <span style={{ color: comp.qualification >= 80 ? '#34D399' : '#94A3B8', fontWeight: '700' }}>
                  {comp.qualification || 0}%
                </span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${comp.qualification || 0}%`,
                    backgroundColor: '#10B981',
                  }}
                />
              </div>
            </div>
          </div>

          {/* AI Recommendation Summary */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={16} color="var(--primary)" />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>AI Synthesis Note</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {candidate.explanation}
            </p>
          </div>
        </div>

        {/* Right Column: Skills Matrix */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Skills Matrix</h3>
              <p className="card-subtitle">Comparison against job requirements</p>
            </div>
          </div>

          {/* Matching Skills */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <CheckCircle2 size={16} color="#10B981" />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6EE7B7' }}>
                Matching Skills ({candidate.matchingSkills?.length || 0})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(candidate.matchingSkills || []).map((skill, idx) => (
                <span key={idx} className="skill-tag skill-tag-match">
                  {skill}
                </span>
              ))}
              {(candidate.matchingSkills || []).length === 0 && (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                  No required or preferred skills matched directly.
                </span>
              )}
            </div>
          </div>

          {/* Missing Required Skills */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <XCircle size={16} color="#F43F5E" />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#FDA4AF' }}>
                Missing Required Skills ({candidate.missingRequiredSkills?.length || 0})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(candidate.missingRequiredSkills || []).map((skill, idx) => (
                <span key={idx} className="skill-tag skill-tag-missing">
                  {skill}
                </span>
              ))}
              {(candidate.missingRequiredSkills || []).length === 0 && (
                <span style={{ color: '#10B981', fontSize: '0.82rem' }}>
                  All required skills present in candidate resume ✓
                </span>
              )}
            </div>
          </div>

          {/* Additional Skills */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Layers size={16} color="var(--text-tertiary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Additional Identified Competencies ({candidate.additionalSkills?.length || 0})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(candidate.additionalSkills || []).slice(0, 10).map((skill, idx) => (
                <span key={idx} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Snippets from Resume Supporting Skills */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Resume Evidence Snippets</h3>
            <p className="card-subtitle">
              Contextual lines extracted from candidate CV confirming identified competencies
            </p>
          </div>
        </div>

        {Object.keys(candidate.evidence || {}).length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
            No explicit context sentences captured for this resume.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {Object.entries(candidate.evidence).slice(0, 8).map(([skill, snippet], idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card-alt)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span className="badge badge-indigo">{skill}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.5' }}>
                  "{snippet}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Education & Experience Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Education */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} color="var(--primary)" />
              <h3 className="card-title">Educational Qualifications</h3>
            </div>
          </div>

          {(candidate.education || []).length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              Educational credentials not explicitly detected in standard formats.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {candidate.education.map((edu, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {edu.degree}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {edu.rawText} • {edu.year}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experience Snippets */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} color="var(--cyan)" />
              <h3 className="card-title">Experience Context</h3>
            </div>
          </div>

          {(candidate.experienceSnippets || []).length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No explicit date ranges or tenure snippets captured.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {candidate.experienceSnippets.map((snippet, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    borderLeft: '3px solid var(--cyan)',
                  }}
                >
                  {snippet}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recruiter Notes Editor Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="var(--primary)" />
            <h3 className="card-title">Recruiter Notes & Interview Observations</h3>
          </div>
          {noteSuccess && (
            <span style={{ fontSize: '0.82rem', color: '#10B981', fontWeight: '600' }}>
              {noteSuccess}
            </span>
          )}
        </div>

        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Add internal feedback, questions to ask in candidate technical interview, salary expectations, or recruiter review decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="btn btn-primary"
          >
            <Save size={16} />
            {savingNotes ? 'Saving...' : 'Save Recruiter Notes'}
          </button>
        </div>
      </div>

      {/* Recruiter Review Decision Modal */}
      {showReviewModal && (
        <CandidateReviewModal
          candidate={{
            ...candidate,
            reviewStatus,
            recruiterNotes: notes,
          }}
          jobTitle={job?.title}
          shortlistThreshold={data?.job?.shortlistThreshold ?? 80}
          onClose={() => setShowReviewModal(false)}
          onSaved={(candId, newStatus, newNotes) => {
            setReviewStatus(newStatus);
            setNotes(newNotes);
          }}
        />
      )}
    </div>
  );
};

export default CandidateDetailPage;
