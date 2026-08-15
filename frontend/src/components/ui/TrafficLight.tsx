import React from 'react';

export type Status = 'healthy' | 'attention' | 'critical';

interface TrafficLightProps {
  items: Array<{
    label: string;
    status: Status;
    tooltip?: string;
  }>;
}

export const TrafficLight: React.FC<TrafficLightProps> = ({ items }) => {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'healthy': return 'bg-success shadow-success/30';
      case 'attention': return 'bg-warning shadow-warning/30';
      case 'critical': return 'bg-danger shadow-danger/30';
      default: return 'bg-neutral-300';
    }
  };

  const getStatusText = (status: Status) => {
    switch (status) {
      case 'healthy': return 'text-success-dark';
      case 'attention': return 'text-warning-dark';
      case 'critical': return 'text-danger-dark';
      default: return 'text-neutral-500';
    }
  };

  const getBgColor = (status: Status) => {
    switch (status) {
      case 'healthy': return 'bg-success-light';
      case 'attention': return 'bg-warning-light';
      case 'critical': return 'bg-danger-light';
      default: return 'bg-neutral-100';
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-neutral-700 mb-4 uppercase tracking-wider">Estado del Negocio</h3>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between group relative" title={item.tooltip}>
            <span className="text-sm font-medium text-neutral-600">{item.label}</span>
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${getBgColor(item.status)}`}>
              <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${getStatusColor(item.status)} animate-pulse`} />
              <span className={`text-xs font-semibold capitalize ${getStatusText(item.status)}`}>
                {item.status === 'healthy' ? 'Óptimo' : item.status === 'attention' ? 'Atención' : 'Crítico'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
