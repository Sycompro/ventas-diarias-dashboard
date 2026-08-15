import React from 'react';
import { AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export type AlertPriority = 'critical' | 'warning' | 'info';

interface AlertBadgeProps {
  priority: AlertPriority;
  title: string;
  description: string;
  recommendation?: string;
  timestamp: Date | string;
  onMarkRead?: () => void;
}

const styles = {
  critical: { icon: <AlertCircle className="w-5 h-5 text-red-600" />, iconBg: 'bg-red-50' },
  warning: { icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, iconBg: 'bg-amber-50' },
  info: { icon: <Info className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-50' },
};

export const AlertBadge: React.FC<AlertBadgeProps> = ({ priority, title, description, recommendation, timestamp, onMarkRead }) => {
  const config = styles[priority];
  const dateObj = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
  } catch (e) {
    timeAgo = 'hace poco';
  }

  return (
    <div className="relative bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h4 className="text-sm font-semibold text-slate-900 truncate">{title}</h4>
            <span className="text-xs text-slate-400 whitespace-nowrap capitalize-first">{timeAgo}</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
          
          {recommendation && (
            <div className="mt-3 bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-700 font-medium">
                <span className="text-slate-500 mr-1 font-normal">Sugerencia:</span>
                {recommendation}
              </p>
            </div>
          )}
          
          {onMarkRead && (
            <div className="mt-4 flex justify-end">
              <button 
                onClick={onMarkRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Marcar como resuelta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
