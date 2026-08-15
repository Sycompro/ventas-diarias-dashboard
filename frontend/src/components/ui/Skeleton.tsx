import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'chart' | 'circle' | 'row';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', className = '' }) => {
  const baseClasses = "animate-pulse bg-slate-200/70";
  
  const variants = {
    text: "h-4 w-full rounded",
    card: "h-32 w-full rounded-xl",
    chart: "h-64 w-full rounded-xl",
    circle: "w-12 h-12 rounded-full",
    row: "h-12 w-full rounded-lg"
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} aria-hidden="true" />
  );
};
