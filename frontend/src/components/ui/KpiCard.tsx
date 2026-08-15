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
    <div className="group relative bg-white rounded-xl shadow-sm p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className={`w-9.5 h-9.5 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{title}</h3>
            <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight">{formattedValue}</p>
            
            {previousValue !== undefined && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded-md text-[10px] font-semibold ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {Math.abs(changePercent).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400">vs anterior</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};
