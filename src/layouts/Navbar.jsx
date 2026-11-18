import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Upload, Bell, ShieldCheck, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Determine current page header title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Recruitment Dashboard';
    if (path === '/jobs') return 'Job Descriptions';
    if (path === '/jobs/new') return 'Create Job Description';
    if (path.includes('/edit')) return 'Edit Job Description';
    if (path.includes('/upload')) return 'Upload & Parse Resumes';
    if (path.includes('/rankings')) return 'AI Candidate Rankings';
    if (path.includes('/candidates/')) return 'Candidate Resume Analysis';
    if (path === '/analytics') return 'Analytics & Matching Reports';
    if (path === '/settings') return 'Recruiter Settings';
    return 'Resume Ranker';
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {getPageTitle()}
        </h1>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <Cpu size={12} />
          NLP Engine Ready
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/upload" className="btn btn-secondary btn-sm">
          <Upload size={15} />
          Upload Resumes
        </Link>
        <Link to="/jobs/new" className="btn btn-primary btn-sm">
          <Plus size={15} />
          New Job
        </Link>

        {/* Recruiter Avatar */}
        <div
          style={{
            marginLeft: '8px',
            paddingLeft: '12px',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.82rem',
              fontWeight: '700',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
