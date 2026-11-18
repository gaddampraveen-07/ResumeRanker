import React from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';

const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'Get started by creating a new job description or uploading candidate resumes.',
  actionLabel,
  actionPath,
  onAction,
}) => {
  return (
    <div className="empty-state card">
      <div className="empty-icon">
        <Icon size={32} />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {actionLabel && actionPath && (
        <Link to={actionPath} className="btn btn-primary">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionPath && (
        <button onClick={onAction} className="btn btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
