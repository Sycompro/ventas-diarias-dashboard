import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'chart' | 'table';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', className = '' }) => {
  const baseClasses = 'animate-pulse bg-neutral-200 rounded';
  
  if (variant === 'card') {
    return (
      <div className={`card p-5 flex flex-col gap-4 ${className}`}>
        <div className="h-6 w-1/3 bg-neutral-200 rounded"></div>
        <div className="h-10 w-1/2 bg-neutral-200 rounded"></div>
        <div className="h-4 w-1/4 bg-neutral-200 rounded"></div>
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`card p-5 h-64 flex flex-col justify-end gap-2 ${className}`}>
        <div className="flex justify-between items-end h-full gap-2 px-4">
          {[40, 70, 45, 90, 65, 30, 85].map((h, i) => (
            <div key={i} className="w-full bg-neutral-200 rounded-t" style={{ height: `${h}%` }}></div>
          ))}
        </div>
      </div>
    );
  }
  
  if (variant === 'table') {
    return (
      <div className={`card overflow-hidden ${className}`}>
        <div className="border-b border-border-subtle p-4 flex gap-4">
          <div className="h-6 w-1/4 bg-neutral-200 rounded"></div>
          <div className="h-6 w-1/4 bg-neutral-200 rounded"></div>
          <div className="h-6 w-1/4 bg-neutral-200 rounded"></div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-border-subtle p-4 flex gap-4">
            <div className="h-4 w-1/4 bg-neutral-100 rounded"></div>
            <div className="h-4 w-1/4 bg-neutral-100 rounded"></div>
            <div className="h-4 w-1/4 bg-neutral-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return <div className={`${baseClasses} ${className}`}></div>;
};
