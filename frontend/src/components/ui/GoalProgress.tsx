import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface GoalProgressProps {
  title: string;
  current: number;
  target: number;
  format?: 'currency' | 'number';
}

export const GoalProgress: React.FC<GoalProgressProps> = ({ title, current, target, format = 'currency' }) => {
  const [width, setWidth] = useState(0);
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  
  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const displayCurrent = format === 'currency' ? formatCurrency(current) : current.toLocaleString('es-PE');
  const displayTarget = format === 'currency' ? formatCurrency(target) : target.toLocaleString('es-PE');
  
  let statusBadge = { text: 'En progreso', colors: 'bg-blue-50 text-blue-700 -blue-200' };
  if (percentage >= 100) statusBadge = { text: 'Cumplida', colors: 'bg-emerald-50 text-emerald-700 -emerald-200' };
  else if (percentage >= 80) statusBadge = { text: 'Cerca', colors: 'bg-amber-50 text-amber-700 -amber-200' };
  else if (percentage < 30) statusBadge = { text: 'En riesgo', colors: 'bg-red-50 text-red-700 -red-200' };

  return (
    <div className="bg-white rounded-xl shadow-sm  -slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">Meta: {displayTarget}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full  ${statusBadge.colors}`}>
          {statusBadge.text}
        </span>
      </div>
      
      <div className="flex items-end gap-3 mb-3">
        <span className="text-3xl font-bold text-slate-900 tabular-nums">{percentage}%</span>
        <span className="text-sm text-slate-500 mb-1 pb-0.5">completado</span>
      </div>

      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
      
      <div className="mt-3 flex justify-between text-xs font-medium">
        <span className="text-slate-700">{displayCurrent} actual</span>
        <span className="text-slate-500">{format === 'currency' ? formatCurrency(Math.max(target - current, 0)) : Math.max(target - current, 0).toLocaleString('es-PE')} faltante</span>
      </div>
    </div>
  );
};
