import React from 'react';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface GoalProgressProps {
  title: string;
  target: number;
  current: number;
  format?: 'currency' | 'number';
}

export const GoalProgress: React.FC<GoalProgressProps> = ({ title, target, current, format = 'currency' }) => {
  const percentage = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  
  let colorClass = 'bg-danger';
  if (percentage >= 80) colorClass = 'bg-success';
  else if (percentage >= 50) colorClass = 'bg-warning';

  const formatValue = (val: number) => format === 'currency' ? formatCurrency(val) : val.toLocaleString();

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-neutral-700">{title}</h4>
        <span className="text-sm font-bold text-neutral-900">{formatPercent(percentage)}</span>
      </div>
      
      <div className="w-full bg-neutral-100 rounded-full h-2.5 mb-4 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full ${colorClass} transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-neutral-500">
        <div>
          <span className="block font-medium text-neutral-700">{formatValue(current)}</span>
          <span>Actual</span>
        </div>
        <div className="text-right">
          <span className="block font-medium text-neutral-700">{formatValue(target)}</span>
          <span>Meta</span>
        </div>
      </div>
      
      {remaining > 0 && (
        <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-center text-neutral-500">
          Falta <span className="font-semibold text-neutral-700">{formatValue(remaining)}</span> para alcanzar la meta
        </div>
      )}
    </div>
  );
};
