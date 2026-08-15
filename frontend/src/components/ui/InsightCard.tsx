import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export type InsightType = 'positive' | 'negative' | 'neutral' | 'warning';

interface InsightCardProps {
  type: InsightType;
  title: string;
  description: string;
  dataPoint?: string;
  dataLabel?: string;
}

const config = {
  positive: { icon: TrendingUp, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', badge: 'Positivo', badgeStyle: 'bg-emerald-100 text-emerald-800' },
  negative: { icon: TrendingDown, iconColor: 'text-red-600', iconBg: 'bg-red-50', badge: 'Negativo', badgeStyle: 'bg-red-100 text-red-800' },
  neutral: { icon: Lightbulb, iconColor: 'text-blue-600', iconBg: 'bg-blue-50', badge: 'Neutral', badgeStyle: 'bg-blue-100 text-blue-800' },
  warning: { icon: AlertTriangle, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', badge: 'Atención', badgeStyle: 'bg-amber-100 text-amber-800' }
};

export const InsightCard: React.FC<InsightCardProps> = ({ type, title, description, dataPoint, dataLabel }) => {
  const { icon: Icon, iconColor, iconBg, badge, badgeStyle } = config[type];

  return (
    <div className="relative bg-white rounded-xl shadow-sm  -slate-200 overflow-hidden hover:shadow-md transition-all p-5 pt-6 flex flex-col h-full group">
      
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${badgeStyle}`}>
          {badge}
        </span>
      </div>
      
      <h4 className="text-base font-semibold text-slate-900 mb-2">{title}</h4>
      <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">{description}</p>
      
      {dataPoint && (
        <div className="mt-auto bg-slate-50  -slate-100 rounded-lg p-3.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">{dataLabel || 'Dato clave'}</span>
          <span className="text-sm font-bold text-slate-900">{dataPoint}</span>
        </div>
      )}
    </div>
  );
};
