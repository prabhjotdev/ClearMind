import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

/** A pre-built skeleton that looks like a task card */
export function TaskCardSkeleton() {
  return (
    <div className="skeleton-task-card" aria-hidden="true">
      <div className="skeleton-task-card-left">
        <Skeleton width="24px" height="24px" borderRadius="50%" />
      </div>
      <div className="skeleton-task-card-body">
        <Skeleton width="70%" height="14px" />
        <Skeleton width="40%" height="12px" className="skeleton-task-card-meta" />
      </div>
    </div>
  );
}

/** A group of skeleton task cards with an optional section heading */
export function TaskListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-task-list" role="status" aria-label="Loading tasks…">
      <Skeleton width="120px" height="12px" className="skeleton-section-header" />
      {Array.from({ length: rows }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}
