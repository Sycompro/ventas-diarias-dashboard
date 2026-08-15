import React from 'react';
import { Clock } from 'lucide-react';
import { HourlyHeatmap } from '../components/charts/HourlyHeatmap';

export const TemporalAnalysisPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Clock className="text-primary" /> Análisis Temporal
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Descubra los momentos de mayor actividad y ventas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HourlyHeatmap />
        </div>
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Resumen de Actividad</h3>
          <div className="space-y-4">
            <div className="p-3 bg-primary-light/50 rounded-lg border border-primary/10">
              <span className="block text-sm text-neutral-600 mb-1">Hora Pico Promedio</span>
              <span className="block text-xl font-bold text-primary-dark">14:00 - 15:00</span>
            </div>
            <div className="p-3 bg-success-light/50 rounded-lg border border-success/10">
              <span className="block text-sm text-neutral-600 mb-1">Mejor Día de la Semana</span>
              <span className="block text-xl font-bold text-success-dark">Viernes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
