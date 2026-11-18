import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy,
  Filter,
  Search,
  RefreshCw,
  Download,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  MessageSquare,
  Upload,
  UserCheck,
  SlidersHorizontal,
  Sparkles,
  Percent,
  FileSpreadsheet,
  X,
  AlertCircle,
} from 'lucide-react';
import { rankingApi, resumeApi, jobApi } from '../services/api';
import ScoreBadge from '../components/common/ScoreBadge';
import ReviewBadge from '../components/common/ReviewBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import CandidateReviewModal from '../components/common/CandidateReviewModal';

const CandidateRankingPage = () => {
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [reviewStatus, setReviewStatus] = useState('All');
  const [minScore, setMinScore] = useState('');
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

  // Recruiter Shortlist Threshold
  const [shortlistThreshold, setShortlistThreshold] = useState(80);
  const [customThresholdInput, setCustomThresholdInput] = useState(80);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);
  const [thresholdSuccessMsg, setThresholdSuccessMsg] = useState('');

  // Multi-select for Comparison
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Recruiter Note Modal
  const [activeNoteCandidate, setActiveNoteCandidate] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Recruiter Review Decision Modal
  const [reviewingCandidate, setReviewingCandidate] = useState(null);

  const handleReviewSaved = (candidateId, newStatus, newNotes) => {
    setRankings((prev) =>
      prev.map((c) =>
        c._id === candidateId
          ? { ...c, reviewStatus: newStatus, recruiterNotes: newNotes }
          : c
      )
    );
  };

  const fetchRankings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await rankingApi.getRankings(jobId, {
        search,
        reviewStatus,
        minScore,
        sortBy,
        order: sortOrder,
      });
      setJob(res.data.job);
      const thresh = res.data.job?.shortlistThreshold ?? 80;
      setShortlistThreshold(thresh);
      setCustomThresholdInput(thresh);
      setRankings(res.data.rankings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [jobId, reviewStatus, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRankings();
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      await rankingApi.triggerRanking(jobId);
      await fetchRankings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to recalculate rankings');
    } finally {
      setRecalculating(false);
    }
  };

  const handleUpdateThreshold = async (newVal, autoApply = true) => {
    const targetVal = Math.max(0, Math.min(100, Number(newVal) || 0));
    setUpdatingThreshold(true);
    setThresholdSuccessMsg('');
    try {
      const res = await rankingApi.updateShortlistThreshold(jobId, targetVal, autoApply);
      setShortlistThreshold(targetVal);
      setCustomThresholdInput(targetVal);
      setJob((prev) => ({ ...prev, shortlistThreshold: targetVal }));
      setThresholdSuccessMsg(res.data.message || `Shortlist threshold set to ${targetVal}%.`);
      await fetchRankings();
      setTimeout(() => setThresholdSuccessMsg(''), 6000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update shortlist threshold');
    } finally {
      setUpdatingThreshold(false);
    }
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    const cand = rankings.find((c) => c._id === candidateId);
    if (newStatus === 'Shortlisted' && cand && cand.overallScore < shortlistThreshold) {
      alert(
        `Candidate cannot be shortlisted: match score (${cand.overallScore}%) is below the recruiter shortlist threshold (${shortlistThreshold}%). Please lower the shortlist cutoff if you wish to include this candidate.`
      );
      return;
    }
    try {
      await rankingApi.updateReviewStatus(candidateId, newStatus);
      setRankings((prev) =>
        prev.map((c) => (c._id === candidateId ? { ...c, reviewStatus: newStatus } : c))
      );
    } catch (err) {
      alert('Failed to update candidate review status: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleSelectCandidate = (candId) => {
    setSelectedCandidates((prev) =>
      prev.includes(candId) ? prev.filter((id) => id !== candId) : [...prev, candId]
    );
  };

  const handleCompare = async () => {
    if (selectedCandidates.length < 2) {
      alert('Please select at least 2 candidates using the checkboxes to compare.');
      return;
    }
    setComparing(true);
    try {
      const res = await rankingApi.compareCandidates(jobId, selectedCandidates);
      setComparisonData(res.data.comparison);
    } catch (err) {
      alert('Comparison failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setComparing(false);
    }
  };

  const openNoteModal = (cand) => {
    setActiveNoteCandidate(cand);
    setNoteContent(cand.recruiterNotes || '');
  };

  const handleSaveNote = async () => {
    if (!activeNoteCandidate) return;
    setSavingNote(true);
    try {
      await rankingApi.addRecruiterNote(activeNoteCandidate._id, noteContent);
      setRankings((prev) =>
        prev.map((c) =>
          c._id === activeNoteCandidate._id ? { ...c, recruiterNotes: noteContent } : c
        )
      );
      setActiveNoteCandidate(null);
    } catch (err) {
      alert('Failed to save recruiter note');
    } finally {
      setSavingNote(false);
    }
  };

  const exportCSV = () => {
    if (rankings.length === 0) return;

    const headers = ['Rank', 'Candidate Name', 'Overall Score', 'Required Skills Match (%)', 'Text Similarity (%)', 'Experience (Yrs)', 'Review Status', 'Recruiter Notes'];
    const rows = rankings.map((r) => [
      r.rank,
      `"${r.candidateName.replace(/"/g, '""')}"`,
      r.overallScore,
      r.componentScores?.requiredSkills || 0,
      r.componentScores?.textSimilarity || 0,
      r.resumeId?.candidateDetails?.yearsOfExperience || 'Not specified',
      r.reviewStatus,
      `"${(r.recruiterNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(job?.title || 'Candidates').replace(/\s+/g, '_')}_Rankings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && rankings.length === 0) {
    return <LoadingSpinner message="Calculating explainable candidate match rankings..." />;
  }

  if (error && !job) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '600px', margin: '40px auto' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'var(--rose-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F43F5E',
          }}
        >
          <AlertCircle size={28} />
        </div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px' }}>
          Unable to Load Rankings
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
          {error}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/" className="btn btn-secondary">
            Go to Dashboard
          </Link>
          <Link to="/jobs" className="btn btn-primary">
            View All Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--rose-subtle)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#FDA4AF',
            fontSize: '0.88rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
              Candidate Rankings
            </h2>
            <span className="badge badge-indigo">
              {rankings.length} Evaluated
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Job: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{job?.title || 'Job Opening'}</span> {job?.company ? `• ${job.company}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="btn btn-secondary"
            title="Re-run TF-IDF vectorization and scoring against updated criteria"
          >
            <RefreshCw size={16} className={recalculating ? 'spin' : ''} />
            {recalculating ? 'Recalculating...' : 'Recalculate Rankings'}
          </button>

          <button onClick={exportCSV} disabled={rankings.length === 0} className="btn btn-secondary">
            <FileSpreadsheet size={16} />
            Export CSV
          </button>

          <button
            onClick={handleCompare}
            disabled={selectedCandidates.length < 2 || comparing}
            className="btn btn-primary"
          >
            <Users size={16} />
            Compare Selected ({selectedCandidates.length})
          </button>

          <Link to={`/upload?jobId=${jobId}`} className="btn btn-primary">
            <Upload size={16} />
            Upload Resumes
          </Link>
        </div>
      </div>

      {/* Decision Support Advisory Alert */}
      <div
        style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          color: '#C7D2FE',
          fontSize: '0.82rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Trophy size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Decision Support System:</strong> Match scores represent objective NLP alignment with the configured job requirements and weights. Final hiring decisions should always involve comprehensive human recruiter review.
        </span>
      </div>

      {/* Recruiter Shortlist Threshold Control Card */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '18px 22px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
              }}
            >
              <Percent size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Recruiter Shortlist Cutoff: <span style={{ color: '#34D399' }}>{shortlistThreshold}%</span>
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Only students/candidates with match score ≥ {shortlistThreshold}% can be shortlisted. You can change this percentage at any time.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: '600',
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              {rankings.filter((c) => c.overallScore >= shortlistThreshold).length} of {rankings.length} Qualified (≥ {shortlistThreshold}%)
            </div>
          </div>
        </div>

        {/* Preset Buttons & Custom Input */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Set Cutoff:</span>
          {[70, 75, 80, 85, 90].map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => handleUpdateThreshold(preset, true)}
              disabled={updatingThreshold}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor:
                  shortlistThreshold === preset ? '#10B981' : 'rgba(255, 255, 255, 0.06)',
                color: shortlistThreshold === preset ? '#FFFFFF' : 'var(--text-secondary)',
                border: `1px solid ${
                  shortlistThreshold === preset ? '#10B981' : 'rgba(255, 255, 255, 0.12)'
                }`,
              }}
            >
              {preset}% {preset === 80 ? '★' : ''}
            </button>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Custom:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={customThresholdInput}
              onChange={(e) => setCustomThresholdInput(e.target.value)}
              style={{
                width: '65px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#FFF',
                fontSize: '0.82rem',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>%</span>
            <button
              type="button"
              onClick={() => handleUpdateThreshold(customThresholdInput, true)}
              disabled={updatingThreshold || Number(customThresholdInput) === shortlistThreshold}
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 12px', fontSize: '0.78rem' }}
            >
              <Sparkles size={13} />
              {updatingThreshold ? 'Applying...' : 'Apply & Auto-Shortlist'}
            </button>
          </div>
        </div>

        {thresholdSuccessMsg && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6EE7B7',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{thresholdSuccessMsg}</span>
            <button
              onClick={() => setThresholdSuccessMsg('')}
              style={{ background: 'none', border: 'none', color: '#6EE7B7', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            justifyContent: 'space-between',
          }}
        >
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search candidate name or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', paddingBottom: '9px', paddingTop: '9px' }}
            />
          </div>

          {/* Review Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              className="form-select"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              style={{ width: '160px', padding: '8px 12px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Awaiting Review">Awaiting Review</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Under Review">Under Review</option>
              <option value="Not Selected">Not Selected</option>
            </select>
          </div>

          {/* Min Score Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Min Score:</span>
            <select
              className="form-select"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              style={{ width: '130px', padding: '8px 12px' }}
            >
              <option value="">Any Score</option>
              <option value="80">80%+ (Strong)</option>
              <option value="60">60%+ (Moderate)</option>
              <option value="40">40%+</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Sort:</span>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: '130px', padding: '8px 12px' }}
            >
              <option value="rank">Rank</option>
              <option value="score">Overall Score</option>
              <option value="name">Candidate Name</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            Apply Filters
          </button>
        </form>
      </div>

      {/* Candidate Rankings Table */}
      {rankings.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates ranked for this opening"
          description="Upload candidate resumes (PDF or DOCX) to initiate AI parsing and automated candidate ranking."
          actionLabel="Upload Resumes"
          actionPath={`/upload?jobId=${jobId}`}
        />
      ) : (
        <div className="table-container card" style={{ padding: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedCandidates.length === rankings.length && rankings.length > 0
                    }
                    onChange={(e) =>
                      setSelectedCandidates(
                        e.target.checked ? rankings.map((r) => r._id) : []
                      )
                    }
                  />
                </th>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Candidate Name</th>
                <th>Match Score</th>
                <th>Matching Skills</th>
                <th>Missing Required</th>
                <th>Experience</th>
                <th>Review Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((cand) => (
                <tr key={cand._id}>
                  {/* Checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(cand._id)}
                      onChange={() => toggleSelectCandidate(cand._id)}
                    />
                  </td>

                  {/* Rank */}
                  <td>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor:
                          cand.rank === 1
                            ? 'rgba(245, 158, 11, 0.2)'
                            : cand.rank === 2
                            ? 'rgba(148, 163, 184, 0.2)'
                            : cand.rank === 3
                            ? 'rgba(217, 119, 6, 0.2)'
                            : 'rgba(255, 255, 255, 0.05)',
                        color:
                          cand.rank === 1
                            ? '#FBBF24'
                            : cand.rank === 2
                            ? '#E2E8F0'
                            : cand.rank === 3
                            ? '#F59E0B'
                            : 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                      }}
                    >
                      {cand.rank}
                    </div>
                  </td>

                  {/* Candidate Name & Link */}
                  <td>
                    <Link
                      to={`/jobs/${jobId}/candidates/${cand._id}`}
                      style={{
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        display: 'block',
                      }}
                    >
                      {cand.candidateName}
                    </Link>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                      {cand.resumeId?.originalFileName || 'Resume.pdf'}
                    </div>
                  </td>

                  {/* Overall Match Score */}
                  <td>
                    <ScoreBadge score={cand.overallScore} />
                    {cand.overallScore >= shortlistThreshold ? (
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: '#34D399',
                          fontWeight: '600',
                          marginTop: '3px',
                        }}
                      >
                        ✓ Cutoff Met (≥{shortlistThreshold}%)
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-tertiary)',
                          marginTop: '3px',
                        }}
                      >
                        Below cutoff (&lt;{shortlistThreshold}%)
                      </div>
                    )}
                  </td>

                  {/* Matching Skills */}
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                      {(cand.matchingSkills || []).slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="skill-tag skill-tag-match">
                          {skill}
                        </span>
                      ))}
                      {(cand.matchingSkills || []).length > 4 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          +{cand.matchingSkills.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Missing Required Skills */}
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                      {(cand.missingRequiredSkills || []).slice(0, 2).map((skill, idx) => (
                        <span key={idx} className="skill-tag skill-tag-missing">
                          {skill}
                        </span>
                      ))}
                      {(cand.missingRequiredSkills || []).length === 0 && (
                        <span style={{ fontSize: '0.78rem', color: '#10B981' }}>None missing ✓</span>
                      )}
                      {(cand.missingRequiredSkills || []).length > 2 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          +{cand.missingRequiredSkills.length - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Experience */}
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {cand.resumeId?.candidateDetails?.yearsOfExperience !== null &&
                    cand.resumeId?.candidateDetails?.yearsOfExperience !== undefined
                      ? `${cand.resumeId.candidateDetails.yearsOfExperience} yrs`
                      : 'Not stated'}
                  </td>

                  {/* Review Status Badge */}
                  <td>
                    <button
                      type="button"
                      onClick={() => setReviewingCandidate(cand)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                      }}
                      title="Click to update review decision & notes"
                    >
                      <ReviewBadge status={cand.reviewStatus} />
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setReviewingCandidate(cand)}
                        className="btn btn-primary btn-sm"
                        title="Add or update recruiter review decision"
                      >
                        <UserCheck size={14} />
                        Review
                      </button>
                      <Link
                        to={`/jobs/${jobId}/candidates/${cand._id}`}
                        className="btn btn-outline btn-sm"
                        title="View complete resume analysis and evidence snippets"
                      >
                        Analysis
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recruiter Note Modal */}
      {activeNoteCandidate && (
        <div className="modal-overlay" onClick={() => setActiveNoteCandidate(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Recruiter Notes</h3>
                <p className="card-subtitle">Candidate: {activeNoteCandidate.candidateName}</p>
              </div>
              <button onClick={() => setActiveNoteCandidate(null)} style={{ color: 'var(--text-tertiary)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Internal Feedback & Interview Observations:</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Enter notes on candidate strengths, interview availability, salary expectations, or team fit..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveNoteCandidate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={savingNote}
                onClick={handleSaveNote}
              >
                {savingNote ? 'Saving...' : 'Save Recruiter Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {comparisonData && (
        <div className="modal-overlay" onClick={() => setComparisonData(null)}>
          <div
            className="modal-content card"
            style={{ maxWidth: '980px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <h3 className="card-title">Side-by-Side Candidate Comparison</h3>
                <p className="card-subtitle">
                  Comparing {comparisonData.candidates.length} candidates for {job?.title}
                </p>
              </div>
              <button onClick={() => setComparisonData(null)} style={{ color: 'var(--text-tertiary)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Overlapping Common Skills */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                marginBottom: '20px',
                fontSize: '0.85rem',
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>Common Overlapping Skills: </strong>
              {comparisonData.commonSkills.length > 0 ? (
                comparisonData.commonSkills.map((s, idx) => (
                  <span key={idx} className="badge badge-emerald" style={{ margin: '2px 4px' }}>
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--text-tertiary)' }}>No shared skills among selected candidates.</span>
              )}
            </div>

            {/* Comparison Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${comparisonData.candidates.length}, 1fr)`,
                gap: '16px',
                overflowX: 'auto',
              }}
            >
              {comparisonData.candidates.map((cand) => (
                <div
                  key={cand.id}
                  style={{
                    background: 'var(--bg-card-alt)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '18px',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: '700' }}>
                      RANK #{cand.rank}
                    </div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '2px' }}>
                      {cand.name}
                    </h4>
                    <div style={{ marginTop: '8px' }}>
                      <ScoreBadge score={cand.overallScore} size="lg" />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', marginBottom: '12px' }}>
                    <div style={{ color: 'var(--text-tertiary)' }}>Experience:</div>
                    <div style={{ fontWeight: '600' }}>
                      {cand.yearsOfExperience ? `${cand.yearsOfExperience} years` : 'Not specified'}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', marginBottom: '12px' }}>
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      Matching Skills ({cand.matchingSkills.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {cand.matchingSkills.map((s, i) => (
                        <span key={i} className="skill-tag skill-tag-match">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      Missing Required:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {cand.missingRequiredSkills.length > 0 ? (
                        cand.missingRequiredSkills.map((s, i) => (
                          <span key={i} className="skill-tag skill-tag-missing">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#10B981' }}>None ✓</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg-input)', padding: '10px', borderRadius: '8px' }}>
                    "{cand.recommendation}"
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <Link
                      to={`/jobs/${jobId}/candidates/${cand.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%' }}
                    >
                      Full Profile Analysis
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Candidate Review Modal */}
      {reviewingCandidate && (
        <CandidateReviewModal
          candidate={reviewingCandidate}
          jobTitle={job?.title}
          shortlistThreshold={shortlistThreshold}
          onClose={() => setReviewingCandidate(null)}
          onSaved={handleReviewSaved}
        />
      )}
    </div>
  );
};

export default CandidateRankingPage;
