import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { jobApi, resumeApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ScoreBadge from '../components/common/ScoreBadge';
import ReviewBadge from '../components/common/ReviewBadge';
import CandidateReviewModal from '../components/common/CandidateReviewModal';

const ResumeUploadPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get('jobId') || '';
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(preselectedJobId);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [reviewingCandidate, setReviewingCandidate] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [loadingSampleResumes, setLoadingSampleResumes] = useState(false);
  const [reprocessingId, setReprocessingId] = useState(null);

  const handleReviewSaved = (candidateId, newStatus, newNotes) => {
    setUploadResults((prev) =>
      prev?.map((item) =>
        item.candidateEvaluationId === candidateId || item.id === candidateId
          ? { ...item, reviewStatus: newStatus, recruiterNotes: newNotes }
          : item
      )
    );
  };

  const handleReprocess = async (resumeId) => {
    try {
      setReprocessingId(resumeId);
      setErrorMessage('');
      const res = await resumeApi.reprocessResume(resumeId);
      setUploadResults((prev) =>
        prev.map((item) =>
          item.id === resumeId
            ? {
                ...item,
                status: 'Completed',
                candidateName: res.data.resume.candidateDetails?.name || item.candidateName,
                overallScore: res.data.evaluation?.overallScore,
                rank: res.data.evaluation?.rank,
                reviewStatus: res.data.evaluation?.reviewStatus,
                candidateEvaluationId: res.data.evaluation?._id,
                skillsCount: res.data.resume.candidateDetails?.skills?.length || 0,
              }
            : item
        )
      );
    } catch (err) {
      setErrorMessage('Failed to reprocess resume: ' + (err.response?.data?.message || err.message));
    } finally {
      setReprocessingId(null);
    }
  };

  const handleLoadSampleResumes = async () => {
    if (!selectedJobId) {
      setErrorMessage('Please select a job opening first.');
      return;
    }
    setLoadingSampleResumes(true);
    setErrorMessage('');
    try {
      const res = await resumeApi.loadSampleResumes(selectedJobId);
      setUploadResults(res.data.results || []);
    } catch (err) {
      setErrorMessage('Failed to load sample resumes: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingSampleResumes(false);
    }
  };

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await jobApi.getJobs();
        const activeJobs = res.data.jobs || [];
        setJobs(activeJobs);
        if (activeJobs.length > 0) {
          setSelectedJobId((current) => current || activeJobs[0]._id);
        }
      } catch (err) {
        console.error('Failed to load jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  const handleCreateSampleJob = async () => {
    try {
      setLoadingJobs(true);
      const res = await jobApi.createJob({
        title: 'Full-Stack Software Engineer',
        company: 'InnovateTech Solutions',
        department: 'Engineering',
        description:
          'We are seeking an experienced Full-Stack Software Engineer proficient in React, Node.js, Python, and cloud infrastructure to design, develop, and maintain robust web platforms and microservices.',
        requiredSkills: ['React', 'Node.js', 'JavaScript', 'Python', 'SQL', 'Git'],
        preferredSkills: ['Docker', 'AWS', 'TypeScript', 'MongoDB'],
        qualifications: ["Bachelor's in Computer Science or related field", '3+ years experience'],
        minimumExperience: 3,
        employmentType: 'Full-time',
        location: 'Remote',
      });
      const newJob = res.data.job;
      setJobs((prev) => [newJob, ...prev]);
      setSelectedJobId(newJob._id);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to create sample job.');
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'doc'].includes(ext)) {
        errors.push(`'${file.name}': Unsupported format. Only PDF and DOCX files are allowed.`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        errors.push(`'${file.name}': File size exceeds 15MB limit.`);
        return;
      }
      // Check for duplicate in current selection
      if (selectedFiles.some((f) => f.name === file.name)) {
        errors.push(`'${file.name}' is already selected.`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
    } else {
      setErrorMessage('');
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedJobId) {
      setErrorMessage('Please select a target job position first.');
      return;
    }
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select at least one PDF or DOCX resume to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setErrorMessage('');
    setUploadResults(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('resumes', file);
    });

    try {
      const res = await resumeApi.uploadResumes(selectedJobId, formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 85) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      });

      setUploadProgress(100);
      setUploadResults(res.data.results || []);
      setSelectedFiles([]);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to upload and process resumes.'
      );
    } finally {
      setUploading(false);
    }
  };

  if (loadingJobs) {
    return <LoadingSpinner message="Loading job descriptions..." />;
  }

  const selectedJob = jobs.find((j) => j._id === selectedJobId);

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.65rem', fontWeight: '800' }}>
          Candidate Resume Upload & NLP Parsing
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Upload multiple candidate CVs (PDF/DOCX). Our AI service parses candidate details, extracts technical competencies, and computes match scores.
        </p>
      </div>

      {/* Target Job Selector Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">1. Target Job Opening</h3>
          {jobs.length === 0 && (
            <Link to="/jobs/new" className="btn btn-outline btn-sm">
              Create New Job
            </Link>
          )}
        </div>

        {jobs.length === 0 ? (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: '600', color: '#FBBF24', marginBottom: '3px' }}>
                No active job positions found.
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Resumes must be evaluated against a specific job role and required skill set.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCreateSampleJob}
                className="btn btn-primary btn-sm"
              >
                Create Sample Job Opening
              </button>
              <Link to="/jobs/new" className="btn btn-outline btn-sm">
                Create Custom Job
              </Link>
            </div>
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Job to Evaluate Candidates Against:</label>
            <select
              className="form-select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              disabled={uploading}
            >
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title} — {job.company} ({job.department})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedJob && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Required Skills for this opening:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(selectedJob.requiredSkills || []).map((skill, idx) => (
                <span key={idx} className="badge badge-indigo">
                  {skill}
                </span>
              ))}
              {(selectedJob.requiredSkills || []).length === 0 && (
                <span style={{ color: 'var(--text-tertiary)' }}>No required skills specified</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">2. Select Candidate Resumes</h3>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--rose-subtle)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#FDA4AF',
              fontSize: '0.88rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-card)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc"
            onChange={(e) => handleFiles(e.target.files)}
            onClick={(e) => {
              e.target.value = null;
            }}
            style={{ display: 'none' }}
          />
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <UploadCloud size={28} />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '6px' }}>
            Drag and drop resume files here, or <span style={{ color: 'var(--primary)' }}>browse</span>
          </h4>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', marginBottom: '14px' }}>
            Supports PDF and DOCX files up to 15MB each. Batch upload up to 20 resumes.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="btn btn-outline btn-sm"
            >
              <FileText size={15} />
              Browse Files from Device
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSampleResumes();
              }}
              disabled={loadingSampleResumes}
              className="btn btn-secondary btn-sm"
              title="Instantly generate and analyze two sample resumes (Alex Chen & Priya Patel) without needing files"
            >
              <Sparkles size={15} />
              {loadingSampleResumes ? 'Loading Samples...' : 'Load Sample Test Resumes (Alex & Priya)'}
            </button>
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                {selectedFiles.length} file(s) selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                style={{ fontSize: '0.8rem', color: '#FDA4AF' }}
              >
                Clear all
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card-alt)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.88rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <FileText size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>

                  {!uploading && (
                    <button
                      onClick={() => removeFile(idx)}
                      style={{ color: 'var(--text-tertiary)', padding: '4px' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div style={{ marginTop: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
              }}
            >
              <span>NLP Parsing & TF-IDF Cosine Similarity Calculation...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  width: `${uploadProgress}%`,
                  background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0 || !selectedJobId}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            {uploading ? (
              'Processing Resumes with AI Engine...'
            ) : (
              <>
                <Sparkles size={18} />
                Upload & Rank {selectedFiles.length} Resume(s)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Results & Next Steps */}
      {uploadResults && (
        <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="#10B981" />
              <h3 className="card-title">Processing Results</h3>
            </div>
            <Link
              to={`/jobs/${selectedJobId}/rankings`}
              className="btn btn-primary btn-sm"
            >
              View Candidate Rankings <ArrowRight size={15} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {uploadResults.map((r, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {r.rank && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                      }}
                    >
                      #{r.rank}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                        {r.candidateName || r.originalFileName}
                      </span>
                      {r.overallScore !== undefined && r.overallScore !== null && (
                        <ScoreBadge score={r.overallScore} size="sm" />
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      File: {r.originalFileName} {r.skillsCount ? `• ${r.skillsCount} skills identified` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {r.status === 'Completed' ? (
                    <>
                      <ReviewBadge status={r.reviewStatus || 'Awaiting Review'} />
                      <button
                        onClick={() =>
                          setReviewingCandidate({
                            _id: r.candidateEvaluationId || r.id,
                            name: r.candidateName,
                            candidateName: r.candidateName,
                            rank: r.rank,
                            overallScore: r.overallScore,
                            reviewStatus: r.reviewStatus || 'Awaiting Review',
                            recruiterNotes: r.recruiterNotes || '',
                          })
                        }
                        className="btn btn-primary btn-sm"
                        title="Add or update recruiter review decision"
                      >
                        <UserCheck size={14} />
                        Add Review
                      </button>
                      {r.candidateEvaluationId && (
                        <Link
                          to={`/jobs/${selectedJobId}/candidates/${r.candidateEvaluationId}`}
                          className="btn btn-outline btn-sm"
                        >
                          Analysis
                        </Link>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className={`badge ${
                          r.status === 'Skipped' ? 'badge-amber' : 'badge-rose'
                        }`}
                      >
                        {r.status} {r.message ? `(${r.message})` : ''}
                      </span>
                      {r.id && (
                        <button
                          type="button"
                          onClick={() => handleReprocess(r.id)}
                          disabled={reprocessingId === r.id}
                          className="btn btn-secondary btn-sm"
                          title="Retry text extraction and AI scoring using native NLP engine"
                        >
                          <RefreshCw size={13} className={reprocessingId === r.id ? 'spin' : ''} />
                          {reprocessingId === r.id ? 'Retrying...' : 'Retry Parsing'}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setReviewingCandidate({
                            _id: r.candidateEvaluationId || r.id,
                            id: r.id,
                            name: r.candidateName || r.originalFileName,
                            candidateName: r.candidateName || r.originalFileName,
                            rank: r.rank || 1,
                            overallScore: r.overallScore || 50,
                            reviewStatus: r.reviewStatus || 'Awaiting Review',
                            recruiterNotes: r.recruiterNotes || '',
                          })
                        }
                        className="btn btn-outline btn-sm"
                        title="Manually set candidate review decision"
                      >
                        <UserCheck size={14} />
                        Set Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recruiter Review Modal */}
      {reviewingCandidate && (
        <CandidateReviewModal
          candidate={reviewingCandidate}
          jobTitle={selectedJob?.title}
          shortlistThreshold={selectedJob?.shortlistThreshold ?? 80}
          onClose={() => setReviewingCandidate(null)}
          onSaved={handleReviewSaved}
        />
      )}
    </div>
  );
};

export default ResumeUploadPage;
