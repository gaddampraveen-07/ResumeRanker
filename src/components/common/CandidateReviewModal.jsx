import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
  Save,
  MessageSquare,
  Award,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import { rankingApi } from '../../services/api';

const REVIEW_OPTIONS = [
  {
    status: 'Shortlisted',
    label: 'Shortlisted',
    description: 'Candidate strongly matches requirements. Proceed to interview.',
    icon: CheckCircle2,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  {
    status: 'Under Review',
    label: 'Under Review',
    description: 'Candidate is under active evaluation by the hiring committee.',
    icon: Clock,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  {
    status: 'Awaiting Review',
    label: 'Awaiting Review',
    description: 'Initial intake state. Pending recruiter assessment.',
    icon: HelpCircle,
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.25)',
  },
  {
    status: 'Not Selected',
    label: 'Not Selected',
    description: 'Candidate does not meet core qualification or experience criteria.',
    icon: XCircle,
    color: '#F43F5E',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
  },
];

const QUICK_TAGS = [
  'Strong technical stack alignment',
  'Schedule initial phone screen',
  'Review candidate portfolio / GitHub',
  'Follow up regarding salary expectations',
  'Does not meet minimum experience threshold',
];

const CandidateReviewModal = ({ candidate, jobTitle, shortlistThreshold = 80, onClose, onSaved }) => {
  if (!candidate) return null;

  const threshold = Number(shortlistThreshold) || 80;
  const candScore = Number(candidate.overallScore) || 0;
  const isShortlistEligible = candScore >= threshold;

  const [selectedStatus, setSelectedStatus] = useState(
    candidate.reviewStatus || 'Awaiting Review'
  );
  const [notes, setNotes] = useState(candidate.recruiterNotes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddQuickTag = (tag) => {
    setNotes((prev) => (prev ? `${prev}\n• ${tag}` : `• ${tag}`));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedStatus === 'Shortlisted' && !isShortlistEligible) {
      setError(
        `Cannot shortlist candidate: match score (${candScore}%) is below the required ${threshold}% shortlist threshold. Adjust the threshold in Job Settings or on the rankings toolbar if you wish to lower it.`
      );
      return;
    }

    setSaving(true);
    try {
      const candidateId = candidate._id || candidate.id || candidate.candidateEvaluationId;
      if (!candidateId) {
        throw new Error('Candidate evaluation ID not found');
      }

      await rankingApi.updateReviewStatus(candidateId, selectedStatus, notes);
      if (onSaved) {
        onSaved(candidateId, selectedStatus, notes);
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to save review decision'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content card"
        style={{ maxWidth: '640px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-indigo">
                Rank #{candidate.rank || '—'}
              </span>
              {jobTitle && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {jobTitle}
                </span>
              )}
            </div>
            <h3 className="card-title" style={{ fontSize: '1.3rem' }}>
              Review Candidate: {candidate.candidateName || candidate.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-tertiary)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Score and Summary Snapshot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--bg-card-alt)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Overall AI Match Score
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Shortlist Cutoff: <strong style={{ color: '#FFF' }}>{threshold}%</strong>
            </div>
          </div>
          <ScoreBadge score={candidate.overallScore} size="md" />
        </div>

        {/* Shortlist Eligibility Advisory Banner */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: isShortlistEligible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isShortlistEligible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            color: isShortlistEligible ? '#34D399' : '#FBBF24',
          }}
        >
          {isShortlistEligible ? (
            <>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Eligible for Shortlisting:</strong> Match score ({candScore}%) satisfies the recruiter requirement (≥ {threshold}%).
              </span>
            </>
          ) : (
            <>
              <HelpCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Below Shortlist Cutoff:</strong> Match score ({candScore}%) is below the {threshold}% threshold. Cannot be marked as Shortlisted unless threshold is lowered.
              </span>
            </>
          )}
        </div>

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Review Decision Options */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
              Select Review Decision:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              {REVIEW_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedStatus === opt.status;
                const isDisabled = opt.status === 'Shortlisted' && !isShortlistEligible;

                return (
                  <div
                    key={opt.status}
                    onClick={() => {
                      if (isDisabled) {
                        setError(
                          `This candidate scored ${candScore}%, which is below the recruiter shortlist threshold of ${threshold}%. They cannot be shortlisted.`
                        );
                        return;
                      }
                      setSelectedStatus(opt.status);
                      setError('');
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      border: `2px solid ${isSelected ? opt.color : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? opt.bg : 'var(--bg-input)',
                      opacity: isDisabled ? 0.45 : 1,
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      position: 'relative',
                    }}
                    title={
                      isDisabled
                        ? `Cannot shortlist: candidate score (${candScore}%) is below the ${threshold}% threshold`
                        : opt.description
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={18} color={opt.color} />
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? '#FFFFFF' : 'var(--text-primary)' }}>
                          {opt.label}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? opt.color : 'var(--border-card)'}`,
                          backgroundColor: isSelected ? opt.color : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF' }} />}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                      {isDisabled ? `Locked: Requires ≥ ${threshold}% match score` : opt.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Note Snippets */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginRight: '6px' }}>
              Quick Templates:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {QUICK_TAGS.map((tag, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleAddQuickTag(tag)}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Recruiter Evaluation Notes */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={14} /> Recruiter Notes & Evaluation Commentary:
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Record candidate strengths, technical interview notes, salary considerations, or decision rationale..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              <UserCheck size={16} />
              {saving ? 'Saving Decision...' : 'Save Review Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateReviewModal;
