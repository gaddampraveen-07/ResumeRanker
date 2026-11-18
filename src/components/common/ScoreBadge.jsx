import React from 'react';

const ScoreBadge = ({ score, size = 'md' }) => {
  const numericScore = typeof score === 'number' ? score : parseFloat(score) || 0;

  let pillClass = 'score-pill-high';
  let label = 'Strong';
  if (numericScore < 60) {
    pillClass = 'score-pill-low';
    label = 'Low';
  } else if (numericScore < 80) {
    pillClass = 'score-pill-mid';
    label = 'Moderate';
  }

  const padding = size === 'sm' ? '2px 8px' : size === 'lg' ? '6px 16px' : '4px 12px';
  const fontSize = size === 'sm' ? '0.78rem' : size === 'lg' ? '1.1rem' : '0.9rem';

  return (
    <span
      className={`score-pill ${pillClass}`}
      style={{ padding, fontSize, letterSpacing: '0.02em' }}
      title={`${numericScore}% match score (${label} Match)`}
    >
      {Math.round(numericScore)}%
    </span>
  );
};

export default ScoreBadge;
