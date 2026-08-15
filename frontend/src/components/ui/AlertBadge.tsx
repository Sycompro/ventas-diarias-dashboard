import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface AlertBadgeProps {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation?: string;
  detectedAt: string;
  isRead: boolean;
  onMarkAsRead: (id: string) => void;
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  id, type, title, description, recommendation, detectedAt, isRead, onMarkAsRead
}) => {
  const config = {
    critical: { icon: AlertCircle, color: 'danger', bg: 'bg-danger-light', text: 'text-danger-dark', border: 'border-danger/20' },
    warning: { icon: AlertTriangle, color: 'warning', bg: 'bg-warning-light', text: 'text-warning-dark', border: 'border-warning/20' },
    info: { icon: Info, color: 'info', bg: 'bg-info-light', text: 'text-info-dark', border: 'border-info/20' },
  }[type];

  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border relative transition-all ${isRead ? 'bg-white border-border-subtle opacity-70' : `${config.bg} ${config.border}`}`}>
      <div className="flex gap-4">
        <div className={`mt-1 shrink-0 ${isRead ? 'text-neutral-400' : config.text}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start gap-4">
            <h4 className={`font-semibold ${isRead ? 'text-neutral-700' : 'text-neutral-900'}`}>{title}</h4>
            <span className="text-xs text-neutral-500 whitespace-nowrap">{formatDateTime(detectedAt)}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
          {recommendation && !isRead && (
            <div className={`mt-3 p-3 rounded text-sm bg-white/60 ${config.text}`}>
              <span className="font-medium">Recomendación:</span> {recommendation}
            </div>
          )}
          {!isRead && (
            <button 
              onClick={() => onMarkAsRead(id)}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <CheckCircle2 size={14} />
              Marcar como leído
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
