import React from 'react';

const ReviewBadge = ({ status }) => {
  const normalized = status || 'Awaiting Review';

  let dotColor = '#94A3B8';
  let badgeClass = 'badge-neutral';

  if (normalized === 'Shortlisted') {
    dotColor = '#10B981';
    badgeClass = 'badge-emerald';
  } else if (normalized === 'Under Review') {
    dotColor = '#F59E0B';
    badgeClass = 'badge-amber';
  } else if (normalized === 'Not Selected') {
    dotColor = '#F43F5E';
    badgeClass = 'badge-rose';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: `0 0 6px ${dotColor}`,
          display: 'inline-block',
        }}
      />
      {normalized}
    </span>
  );
};

export default ReviewBadge;
