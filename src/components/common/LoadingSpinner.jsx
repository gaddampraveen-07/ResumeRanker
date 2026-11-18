import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = 'Analyzing candidate data with NLP models...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '16px',
      }}
    >
      <Loader2
        size={36}
        color="var(--primary)"
        style={{ animation: 'spin 1s linear infinite' }}
      />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: '500' }}>
        {message}
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
