import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, User, Building, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDENTIALS = {
  email: 'recruiter@techcorp.com',
  password: 'Password@123',
};

const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: DEMO_CREDENTIALS.email,
    password: DEMO_CREDENTIALS.password,
    company: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSwitchMode = (registerMode) => {
    setIsRegister(registerMode);
    setError('');
    if (registerMode) {
      setFormData((prev) => ({
        ...prev,
        email: prev.email === DEMO_CREDENTIALS.email ? '' : prev.email,
        password: prev.password === DEMO_CREDENTIALS.password ? '' : prev.password,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        email: prev.email || DEMO_CREDENTIALS.email,
        password: prev.password || DEMO_CREDENTIALS.password,
      }));
    }
  };

  const fillDemoCredentials = () => {
    setIsRegister(false);
    setError('');
    setFormData((prev) => ({
      ...prev,
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!formData.name || !formData.email || !formData.password) {
          throw new Error('Please fill in all required fields.');
        }
        await register(formData.name, formData.email, formData.password, formData.company);
      } else {
        if (!formData.email || !formData.password) {
          throw new Error('Please enter both email and password.');
        }
        await login(formData.email, formData.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(ellipse at 50% 20%, #151F38 0%, #080C14 70%)',
      }}
    >
      <div style={{ maxWidth: '440px', width: '100%' }}>
        {/* Logo and header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.45)',
            }}
          >
            <Sparkles size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '8px' }}>
            Resume Ranker
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Intelligent Resume Parsing & Explainable Candidate Ranking
          </p>
        </div>

        {/* Auth Card */}
        <div className="card" style={{ padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              marginBottom: '24px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleSwitchMode(false)}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: !isRegister ? '#FFFFFF' : 'var(--text-secondary)',
                backgroundColor: !isRegister ? 'var(--primary)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode(true)}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: isRegister ? '#FFFFFF' : 'var(--text-secondary)',
                backgroundColor: isRegister ? 'var(--primary)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--rose-subtle)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#FDA4AF',
                fontSize: '0.85rem',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={17}
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
                      name="name"
                      className="form-input"
                      placeholder="e.g. Sarah Jenkins"
                      value={formData.name}
                      onChange={handleChange}
                      style={{ paddingLeft: '38px' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Company / Organization</label>
                  <div style={{ position: 'relative' }}>
                    <Building
                      size={17}
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
                      name="company"
                      className="form-input"
                      placeholder="e.g. Acme Corp Talent Team"
                      value={formData.company}
                      onChange={handleChange}
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Work Email</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                  }}
                />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="recruiter@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                  }}
                />
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: '38px' }}
                  required
                  minLength={6}
                />
              </div>
              {isRegister && (
                <p className="form-hint">Must be at least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px' }}
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  {isRegister ? 'Create Recruiter Account' : 'Sign In to Dashboard'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials info */}
          <div
            style={{
              marginTop: '24px',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.22)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Demo Recruiter Account (Pre-filled)</strong>
              <button
                type="button"
                onClick={fillDemoCredentials}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#818CF8',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Use Demo
              </button>
            </div>
            <div>Email: <code style={{ color: '#C7D2FE' }}>{DEMO_CREDENTIALS.email}</code></div>
            <div>Password: <code style={{ color: '#C7D2FE' }}>{DEMO_CREDENTIALS.password}</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
