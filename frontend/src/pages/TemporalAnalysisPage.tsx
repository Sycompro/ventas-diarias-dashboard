import React from 'react';
import { Clock, TrendingUp, Calendar } from 'lucide-react';
import { HourlyHeatmap } from '../components/charts/HourlyHeatmap';
import { useQuery } from '@tanstack/react-query';
import { salesService } from '../services/api';
import { useFilters } from '../hooks/useFilters';
import { useSalesTrend } from '../hooks/useSalesMetrics';
import { Skeleton } from '../components/ui/Skeleton';

export const TemporalAnalysisPage: React.FC = () => {
  const filters = useFilters();

  // Query to fetch hourly sales data
  const { data: hourlyData = [], isLoading: loadingHourly } = useQuery({
    queryKey: ['sales-by-hour', filters],
    queryFn: () => salesService.getByHour({
      companyId: filters.companyId,
      dateStart: filters.dateStart,
      dateEnd: filters.dateEnd
    }),
    enabled: !!filters.companyId
  });

  // Query to fetch daily trends to calculate the best day of the week
  const { data: trendData = [], isLoading: loadingTrend } = useSalesTrend();

  // 1. Calculate Peak Hour
  const peakHourItem = hourlyData.reduce((max: any, item: any) => {
    return parseFloat(item.total || 0) > parseFloat(max.total || 0) ? item : max;
  }, { hour: 0, total: 0 });

  const peakHourStr = peakHourItem && parseFloat(peakHourItem.total || 0) > 0
    ? `${peakHourItem.hour.toString().padStart(2, '0')}:00 - ${(peakHourItem.hour + 1).toString().padStart(2, '0')}:00`
    : 'Sin Datos';

  // 2. Calculate Best Day of the Week
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const daySales = [0, 0, 0, 0, 0, 0, 0];
  trendData.forEach((pt: any) => {
    try {
      const dayIndex = new Date(pt.date).getDay();
      if (!isNaN(dayIndex)) {
        daySales[dayIndex] += parseFloat(pt.total || 0);
      }
    } catch (e) {
      // Ignorar errores de parseo de fechas
    }
  });

  const bestDayIndex = daySales.reduce((maxIdx, val, idx, arr) => {
    return val > arr[maxIdx] ? idx : maxIdx;
  }, 0);

  const bestDayStr = Math.max(...daySales) > 0 
    ? daysOfWeek[bestDayIndex] 
    : 'Sin Datos';

  // Format hourlyData for the chart component
  const formattedHourlyData = hourlyData.map((item: any) => {
    const hour = item.hour;
    return {
      hour: `${hour}:00`,
      displayHour: `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}${hour >= 12 ? 'pm' : 'am'}`,
      amount: parseFloat(item.total || 0),
      count: parseInt(item.count || 0, 10)
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Clock className="text-primary" /> Análisis Temporal
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Descubra los momentos de mayor actividad y ventas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        <div className="lg:col-span-2">
          <HourlyHeatmap data={formattedHourlyData} isLoading={loadingHourly} />
        </div>
        
        <div className="card p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-50">Resumen de Actividad</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Hora Pico Promedio
                </span>
                {loadingHourly ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className="block text-lg font-bold text-slate-800">{peakHourStr}</span>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Mejor Día de la Semana
                </span>
                {loadingTrend ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className="block text-lg font-bold text-slate-800">{bestDayStr}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-4 h-4" /> Optimización de Turnos
            </span>
            <p className="text-xs text-indigo-600 leading-relaxed">
              Planifica el personal de caja y atención en base a las horas pico identificadas para evitar cuellos de botella en horas con mayor volumen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
