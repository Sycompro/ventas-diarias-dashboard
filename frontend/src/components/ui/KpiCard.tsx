import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

interface KpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'number' | 'percent';
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  previousValue,
  format,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const stepTime = Math.abs(Math.floor(duration / steps));
    let current = 0;
    
    const timer = setInterval(() => {
      current += 1;
      setDisplayValue(value * (current / steps));
      if (current === steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  const formattedValue = 
    format === 'currency' ? formatCurrency(displayValue) :
    format === 'percent' ? formatPercent(displayValue) :
    formatNumber(Math.round(displayValue));

  let changePercent = 0;
  if (previousValue && previousValue > 0) {
    changePercent = ((value - previousValue) / previousValue) * 100;
  }
  const isPositive = changePercent >= 0;

  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</h3>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{formattedValue}</p>
            
            {previousValue !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(changePercent).toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">vs periodo anterior</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};
