import React from 'react';
import { Lightbulb } from 'lucide-react';
import { InsightCard } from '../components/ui/InsightCard';
import { useQuery } from '@tanstack/react-query';
import { intelligenceService } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';

export const InsightsPage: React.FC = () => {
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => intelligenceService.getInsights()
  });

  const getDataLabel = (title: string): string => {
    if (title.toLowerCase().includes('vendedor')) return 'Rendimiento';
    if (title.toLowerCase().includes('hora') || title.toLowerCase().includes('horario')) return 'Horarios';
    if (title.toLowerCase().includes('pago') || title.toLowerCase().includes('efectivo') || title.toLowerCase().includes('tarjeta')) return 'Pagos';
    return 'General';
  };

  const getDataPoint = (insight: any): string => {
    if (!insight.data) return '';
    if (insight.data.total !== undefined) {
      return `S/. ${insight.data.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (insight.data.hour !== undefined) {
      const h = insight.data.hour;
      return `${h.toString().padStart(2, '0')}:00`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Lightbulb className="text-primary" /> Insights Inteligentes
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Descubrimientos automáticos basados en el análisis de sus datos.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[220px]" />
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 max-w-xl mx-auto">
          <Lightbulb className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-center">Aún no hay suficientes datos para generar insights inteligentes.</p>
          <p className="text-xs text-slate-400 mt-1 text-center">Continúa registrando transacciones para activar las sugerencias del sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {insights.map((insight: any, index: number) => (
            <InsightCard 
              key={index}
              type={insight.type || 'neutral'}
              dataLabel={getDataLabel(insight.title)}
              title={insight.title}
              description={insight.description}
              dataPoint={getDataPoint(insight)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
