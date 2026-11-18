import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
  UserCheck,
  Clock,
  Plus,
  Upload,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { analyticsApi, authApi } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSeedDemo = async (force = false) => {
    try {
      setSeeding(true);
      setSeedMsg('');
      const res = await authApi.seedDemo({ force, shortlistThreshold: 80 });
      setSeedMsg(res.data.message || 'Demo data loaded successfully!');
      await fetchDashboard();
    } catch (err) {
      setSeedMsg(err.response?.data?.message || 'Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching live recruitment analytics and database metrics..." />;
  }

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const recent = data?.recentActivity || { jobs: [], resumes: [] };

  const hasData = (stats.totalJobs || 0) > 0 || (stats.totalResumes || 0) > 0;

  return (
    <div>
      {/* Welcome & Action Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: '800' }}>Executive Overview</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live NLP parsing, cosine similarity metrics, and candidate evaluation pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!hasData && (
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="btn btn-secondary"
              title="Populate test jobs and realistic resumes for quick evaluation"
            >
              <Sparkles size={16} color="var(--primary)" />
              {seeding ? 'Generating Sample Data...' : 'Load Sample Demo Data'}
            </button>
          )}
          <Link to="/upload" className="btn btn-secondary">
            <Upload size={16} />
            Upload Resumes
          </Link>
          <Link to="/jobs/new" className="btn btn-primary">
            <Plus size={16} />
            Create Job Description
          </Link>
        </div>
      </div>

      {seedMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-subtle)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#A5B4FC',
            fontSize: '0.88rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{seedMsg}</span>
          <button onClick={() => setSeedMsg('')} style={{ color: 'inherit', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">{stats.totalJobs || 0}</div>
            <div className="stat-title">Active Job Openings</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--primary)' }}>
            <Briefcase size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">{stats.totalResumes || 0}</div>
            <div className="stat-title">Resumes Processed</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--cyan)' }}>
            <FileText size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: stats.averageScore >= 70 ? '#34D399' : '#FBBF24' }}>
              {stats.averageScore ? `${stats.averageScore}%` : '0%'}
            </div>
            <div className="stat-title">Average Match Score</div>
          </div>
          <div className="stat-icon" style={{ color: '#FBBF24' }}>
            <Award size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#34D399' }}>
              {stats.shortlistedCount || 0}
            </div>
            <div className="stat-title">Shortlisted Candidates</div>
          </div>
          <div className="stat-icon" style={{ color: '#34D399' }}>
            <UserCheck size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#94A3B8' }}>
              {stats.awaitingReviewCount || 0}
            </div>
            <div className="stat-title">Awaiting Recruiter Review</div>
          </div>
          <div className="stat-icon" style={{ color: '#94A3B8' }}>
            <Clock size={24} />
          </div>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={Briefcase}
          title="No recruitment data yet"
          description="Your recruitment pipeline is currently empty. Create your first job description or load sample demo data to see AI ranking and analytics in action."
          actionLabel="Load Sample Demo Data"
          onAction={handleSeedDemo}
        />
      ) : (
        <>
          {/* Charts Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '24px',
              marginBottom: '28px',
            }}
          >
            {/* Score Distribution Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Candidate Match Score Distribution</h3>
                  <p className="card-subtitle">Breakdown of evaluated resumes across qualification tiers</p>
                </div>
              </div>
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.scoreDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="range" stroke="var(--text-tertiary)" fontSize={12} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#FFF',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {(charts.scoreDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || '#6366F1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Candidates Per Job Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Candidates Pipeline by Job Opening</h3>
                  <p className="card-subtitle">Volume of resumes uploaded per position</p>
                </div>
              </div>
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.candidatesPerJob || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#FFF',
                      }}
                    />
                    <Bar dataKey="resumes" name="Resumes" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Activity Tables Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Recent Job Activity */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Recent Job Descriptions</h3>
                  <p className="card-subtitle">Active roles accepting candidate resumes</p>
                </div>
                <Link to="/jobs" className="btn btn-outline btn-sm">
                  View All
                </Link>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.jobs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                          No jobs created yet.
                        </td>
                      </tr>
                    ) : (
                      recent.jobs.map((job) => (
                        <tr key={job._id}>
                          <td>
                            <div style={{ fontWeight: '600' }}>{job.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              {job.company}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{job.department}</td>
                          <td>
                            <span className="badge badge-emerald">{job.status}</span>
                          </td>
                          <td>
                            <Link
                              to={`/jobs/${job._id}/rankings`}
                              style={{
                                color: 'var(--primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                              }}
                            >
                              Rankings <ArrowUpRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Uploads */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Recent Resume Uploads</h3>
                  <p className="card-subtitle">Candidates processed by NLP engine</p>
                </div>
                <Link to="/upload" className="btn btn-outline btn-sm">
                  Upload More
                </Link>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Target Role</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.resumes.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                          No resumes uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      recent.resumes.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: '600' }}>{r.candidateName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                              {r.fileName}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                            {r.jobTitle}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                r.status === 'Completed'
                                  ? 'badge-emerald'
                                  : r.status === 'Processing'
                                  ? 'badge-amber'
                                  : 'badge-rose'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
