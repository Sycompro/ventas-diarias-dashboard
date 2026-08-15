import React from 'react';
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';

interface InsightCardProps {
  type: 'opportunity' | 'trend' | 'anomaly';
  title: string;
  description: string;
  dataPoint?: string;
  category: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({ type, title, description, dataPoint, category }) => {
  const config = {
    opportunity: { icon: Lightbulb, color: 'text-info', bg: 'bg-info-light' },
    trend: { icon: TrendingUp, color: 'text-success', bg: 'bg-success-light' },
    anomaly: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-light' },
  }[type];

  const Icon = config.icon;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
      
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg ${config.bg} ${config.color}`}>
          <Icon size={20} />
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
          {category}
        </span>
      </div>
      
      <h4 className="font-semibold text-neutral-900 mb-2">{title}</h4>
      <p className="text-sm text-neutral-600 line-clamp-3">{description}</p>
      
      {dataPoint && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <span className="text-lg font-bold text-neutral-900">{dataPoint}</span>
        </div>
      )}
    </div>
  );
};
