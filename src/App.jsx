import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import MainLayout from './layouts/MainLayout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import JobListPage from './pages/JobListPage';
import JobFormPage from './pages/JobFormPage';
import ResumeUploadPage from './pages/ResumeUploadPage';
import CandidateRankingPage from './pages/CandidateRankingPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import LoadingSpinner from './components/common/LoadingSpinner';
import { jobApi } from './services/api';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Authenticating recruiter session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Checking recruiter session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RankingsRedirect = () => {
  const [target, setTarget] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    jobApi
      .getJobs()
      .then((res) => {
        const jobs = res.data.jobs || [];
        if (jobs.length > 0) {
          setTarget(`/jobs/${jobs[0]._id}/rankings`);
        } else {
          setTarget('/jobs');
        }
      })
      .catch(() => setTarget('/jobs'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading candidate rankings..." />;
  return <Navigate to={target || '/jobs'} replace />;
};

function App() {
  return (
    <Routes>
      {/* Public Authentication routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <AuthPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <AuthPage />
          </PublicOnlyRoute>
        }
      />

      {/* Protected Recruiter Application routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="jobs" element={<JobListPage />} />
        <Route path="jobs/new" element={<JobFormPage />} />
        <Route path="jobs/:jobId/edit" element={<JobFormPage />} />
        <Route path="rankings" element={<RankingsRedirect />} />
        <Route path="jobs/:jobId/rankings" element={<CandidateRankingPage />} />
        <Route path="jobs/:jobId/candidates/:candidateId" element={<CandidateDetailPage />} />
        <Route path="upload" element={<ResumeUploadPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
