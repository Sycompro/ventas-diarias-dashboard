import React from 'react';

export type TrafficStatus = 'healthy' | 'attention' | 'critical';

export interface TrafficIndicatorProps {
  label: string;
  description: string;
  status: TrafficStatus;
}

const colorMap = {
  healthy: { bg: 'bg-emerald-500' },
  attention: { bg: 'bg-amber-500' },
  critical: { bg: 'bg-red-500' },
};

export const TrafficLight: React.FC<{ indicators: TrafficIndicatorProps[] }> = ({ indicators }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {indicators.map((indicator, idx) => {
        const colors = colorMap[indicator.status];
        return (
          <div key={idx} className="relative bg-white rounded-xl border border-slate-200/80 p-4 hover:border-slate-300 hover:bg-slate-50/20 transition-all">
            <div className="flex items-start gap-3">
              <div className="relative flex items-center justify-center w-4 h-4 mt-0.5">
                {indicator.status === 'critical' && (
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-red-400"></span>
                )}
                <span className={`relative inline-flex rounded-full w-3 h-3 ${colors.bg}`}></span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{indicator.label}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{indicator.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
