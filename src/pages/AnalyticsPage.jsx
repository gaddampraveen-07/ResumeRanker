import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Award, Layers, Target, CheckCircle2 } from 'lucide-react';
import { jobApi, analyticsApi } from '../services/api';
import ScoreBadge from '../components/common/ScoreBadge';
import ReviewBadge from '../components/common/ReviewBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const AnalyticsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingJob, setLoadingJob] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await jobApi.getJobs();
        const activeJobs = res.data.jobs || [];
        setJobs(activeJobs);
        if (activeJobs.length > 0) {
          setSelectedJobId(activeJobs[0]._id);
        }
      } catch (err) {
        console.error('Failed to load jobs for analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;

    const fetchJobMetrics = async () => {
      try {
        setLoadingJob(true);
        const res = await analyticsApi.getJobAnalytics(selectedJobId);
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load job analytics:', err);
      } finally {
        setLoadingJob(false);
      }
    };
    fetchJobMetrics();
  }, [selectedJobId]);

  if (loading) {
    return <LoadingSpinner message="Calculating aggregate NLP analytics..." />;
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No jobs available for analytics"
        description="Create job descriptions and upload resumes to view skill coverage metrics and match analytics."
        actionLabel="Create Job Description"
        actionPath="/jobs/new"
      />
    );
  }

  const stats = analytics?.stats || {};
  const compAvg = analytics?.componentAverages || {};
  const skillCoverage = analytics?.skillCoverage || [];
  const topCandidates = analytics?.topCandidates || [];

  const radarData = [
    { subject: 'Required Skills', value: compAvg.requiredSkills || 0 },
    { subject: 'Preferred Skills', value: compAvg.preferredSkills || 0 },
    { subject: 'Text Similarity', value: compAvg.textSimilarity || 0 },
    { subject: 'Experience', value: compAvg.experience || 0 },
    { subject: 'Qualification', value: compAvg.qualification || 0 },
  ];

  return (
    <div>
      {/* Header with Job Selector */}
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
          <h2 style={{ fontSize: '1.65rem', fontWeight: '800' }}>Matching Analytics & Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Detailed breakdown of applicant pool competencies, NLP similarity, and skill coverage.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Analyze Position:
          </span>
          <select
            className="form-select"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            style={{ width: '280px' }}
          >
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title} ({job.company})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingJob ? (
        <LoadingSpinner message="Aggregating skill coverage and candidate performance..." />
      ) : (
        <>
          {/* Quick Metrics Cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-value">{stats.totalResumes || 0}</div>
                <div className="stat-title">Applicant Resumes</div>
              </div>
              <div className="stat-icon" style={{ color: 'var(--primary)' }}>
                <Layers size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-value" style={{ color: '#34D399' }}>
                  {stats.completed || 0}
                </div>
                <div className="stat-title">Successfully Processed</div>
              </div>
              <div className="stat-icon" style={{ color: '#34D399' }}>
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-value" style={{ color: '#FBBF24' }}>
                  {stats.averageScore ? `${stats.averageScore}%` : '0%'}
                </div>
                <div className="stat-title">Average Match Index</div>
              </div>
              <div className="stat-icon" style={{ color: '#FBBF24' }}>
                <Award size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-value" style={{ color: 'var(--cyan)' }}>
                  {compAvg.textSimilarity ? `${compAvg.textSimilarity}%` : '0%'}
                </div>
                <div className="stat-title">Avg Semantic Text Alignment</div>
              </div>
              <div className="stat-icon" style={{ color: 'var(--cyan)' }}>
                <Target size={24} />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '24px',
              marginBottom: '28px',
            }}
          >
            {/* Required Skills Coverage Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Required Skill Coverage in Applicant Pool</h3>
                  <p className="card-subtitle">
                    Percentage of candidates who demonstrate each required competency
                  </p>
                </div>
              </div>

              {skillCoverage.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No required skills configured for this job opening.
                </div>
              ) : (
                <div style={{ height: '280px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={skillCoverage}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" domain={[0, 100]} stroke="var(--text-tertiary)" fontSize={12} unit="%" />
                      <YAxis dataKey="skill" type="category" stroke="var(--text-tertiary)" fontSize={12} width={90} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          borderColor: 'rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#FFF',
                        }}
                        formatter={(val) => [`${val}% of applicants`, 'Coverage']}
                      />
                      <Bar dataKey="percentage" fill="#6366F1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Component Radar Benchmark */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Evaluation Component Averages</h3>
                  <p className="card-subtitle">Aggregated scoring dimension benchmarks (0-100 scale)</p>
                </div>
              </div>

              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--text-tertiary)" fontSize={10} />
                    <Radar
                      name="Applicant Benchmark"
                      dataKey="value"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.4}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#FFF',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Candidates for this position */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Top Evaluated Candidates</h3>
                <p className="card-subtitle">Highest scoring applicants for this position</p>
              </div>
            </div>

            {topCandidates.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
                No evaluated candidates for this opening yet.
              </p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate Name</th>
                      <th>Overall Match Score</th>
                      <th>Review Status</th>
                      <th style={{ textAlign: 'right' }}>Analysis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCandidates.map((cand) => (
                      <tr key={cand.id}>
                        <td>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
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
                            #{cand.rank}
                          </div>
                        </td>
                        <td style={{ fontWeight: '600' }}>{cand.name}</td>
                        <td>
                          <ScoreBadge score={cand.score} />
                        </td>
                        <td>
                          <ReviewBadge status={cand.reviewStatus} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <a
                            href={`/jobs/${selectedJobId}/candidates/${cand.id}`}
                            className="btn btn-outline btn-sm"
                          >
                            Inspect Evidence
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
