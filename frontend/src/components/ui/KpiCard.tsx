import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

interface KpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'currency' | 'number' | 'percent';
  icon: LucideIcon;
  color?: string;
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  previousValue,
  format = 'currency',
  icon: Icon,
  color = 'primary',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="card p-5 flex flex-col gap-3 animate-pulse">
        <div className="flex justify-between items-start">
          <div className="h-4 bg-neutral-200 rounded w-24"></div>
          <div className="h-8 w-8 bg-neutral-200 rounded-full"></div>
        </div>
        <div className="h-8 bg-neutral-200 rounded w-32 mt-2"></div>
        <div className="h-4 bg-neutral-200 rounded w-20 mt-1"></div>
      </div>
    );
  }

  const formattedValue = 
    format === 'currency' ? formatCurrency(value) :
    format === 'percent' ? formatPercent(value) :
    formatNumber(value);

  let change = 0;
  let isPositive = true;
  let isNeutral = false;

  if (previousValue !== undefined) {
    change = previousValue === 0 ? 100 : ((value - previousValue) / previousValue) * 100;
    isPositive = change > 0;
    isNeutral = change === 0;
  }

  return (
    <div className="card p-5 flex flex-col transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
        <div className={`p-2 rounded-full bg-${color}-light text-${color}-dark`}>
          <Icon size={18} />
        </div>
      </div>
      
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-neutral-900">{formattedValue}</span>
      </div>

      {previousValue !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-sm">
          {isNeutral ? (
            <Minus size={16} className="text-neutral-500" />
          ) : isPositive ? (
            <TrendingUp size={16} className="text-success" />
          ) : (
            <TrendingDown size={16} className="text-danger" />
          )}
          <span className={`font-medium ${
            isNeutral ? 'text-neutral-500' : isPositive ? 'text-success' : 'text-danger'
          }`}>
            {formatPercent(Math.abs(change))}
          </span>
          <span className="text-neutral-500 ml-1">vs ant.</span>
        </div>
      )}
    </div>
  );
};
