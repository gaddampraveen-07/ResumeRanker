import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Upload,
  Trophy,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { jobApi } from '../services/api';
import ScoreBadge from '../components/common/ScoreBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const JobListPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [deletingId, setDeletingId] = useState(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await jobApi.getJobs({
        search,
        department,
        status,
      });
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [department, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleDeleteJob = async (jobId, title) => {
    if (!window.confirm(`Are you sure you want to delete '${title}' and all its associated resumes and candidate evaluations? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(jobId);
      await jobApi.deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch (err) {
      alert('Failed to delete job: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && jobs.length === 0) {
    return <LoadingSpinner message="Loading job descriptions and candidate counts..." />;
  }

  return (
    <div>
      {/* Header */}
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
          <h2 style={{ fontSize: '1.65rem', fontWeight: '800' }}>Job Openings Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage active roles, inspect candidate volume, and trigger automated resume ranking.
          </p>
        </div>

        <Link to="/jobs/new" className="btn btn-primary">
          <Plus size={16} />
          Create Job Description
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <form
          onSubmit={handleSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            justifyContent: 'space-between',
          }}
        >
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
              placeholder="Search by job title or required skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', paddingBottom: '9px', paddingTop: '9px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Department:</span>
            <select
              className="form-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ width: '160px', padding: '8px 12px' }}
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Data & AI">Data & AI</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="DevOps & Cloud">DevOps & Cloud</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '130px', padding: '8px 12px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job descriptions found"
          description="Create your first job description to start uploading resumes and ranking candidates."
          actionLabel="Create New Job"
          actionPath="/jobs/new"
        />
      ) : (
        <div className="table-container card" style={{ padding: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Job Title & Company</th>
                <th>Department</th>
                <th>Location / Type</th>
                <th>Resumes</th>
                <th>Top Match</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td>
                    <Link
                      to={`/jobs/${job._id}/rankings`}
                      style={{ fontWeight: '600', color: 'var(--text-primary)' }}
                    >
                      {job.title}
                    </Link>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {job.company} • Created {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    {job.department}
                  </td>

                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {job.location} ({job.employmentType})
                  </td>

                  <td>
                    <span className="badge badge-indigo">
                      {job.resumeCount || 0} candidate(s)
                    </span>
                  </td>

                  <td>
                    {job.topScore !== null ? (
                      <ScoreBadge score={job.topScore} size="sm" />
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Unranked</span>
                    )}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        job.status === 'Active'
                          ? 'badge-emerald'
                          : job.status === 'Draft'
                          ? 'badge-amber'
                          : 'badge-neutral'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Link
                        to={`/jobs/${job._id}/rankings`}
                        className="btn btn-primary btn-sm"
                        title="View Ranked Candidates"
                      >
                        <Trophy size={14} />
                        Rankings
                      </Link>

                      <Link
                        to={`/upload?jobId=${job._id}`}
                        className="btn btn-outline btn-sm"
                        title="Upload Resumes"
                      >
                        <Upload size={14} />
                      </Link>

                      <Link
                        to={`/jobs/${job._id}/edit`}
                        className="btn btn-outline btn-sm"
                        title="Edit Job Description"
                      >
                        <Edit size={14} />
                      </Link>

                      <button
                        onClick={() => handleDeleteJob(job._id, job.title)}
                        disabled={deletingId === job._id}
                        className="btn btn-danger btn-sm"
                        title="Delete Job"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JobListPage;
