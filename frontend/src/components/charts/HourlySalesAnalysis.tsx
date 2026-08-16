import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { 
  Clock, 
  Zap, 
  Flame, 
  Sunrise, 
  Sun, 
  Moon, 
  BarChart3, 
  Table as TableIcon,
  Receipt,
  TrendingUp,
  Percent
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface HourlyDataPoint {
  hour: number;
  total: number;
  count: number;
}

interface HourlySalesAnalysisProps {
  data?: HourlyDataPoint[];
  isLoading?: boolean;
}

export const HourlySalesAnalysis: React.FC<HourlySalesAnalysisProps> = ({ 
  data = [], 
  isLoading = false 
}) => {
  const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');

  // Procesamiento y cálculo de métricas horarias en formato 12 Horas (AM / PM)
  const {
    hourlyData,
    peakHour,
    peakCountHour,
    totalAmount,
    totalCount,
    avgTicket,
    timeSlots,
    dominantSlot,
    activeHoursCount
  } = useMemo(() => {
    // Helper para formato de 12 Horas
    const format12Hour = (h: number) => {
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      return {
        short: `${h12} ${ampm}`,
        display: `${h12}:00 ${ampm}`,
        range: `${h12}:00 ${ampm} - ${h12}:59 ${ampm}`,
      };
    };

    // Mapa rápido de datos por hora
    const hourMap = new Map<number, { total: number; count: number }>();
    let sumAmount = 0;
    let sumCount = 0;

    data.forEach((d) => {
      hourMap.set(d.hour, { total: d.total, count: d.count });
      sumAmount += d.total;
      sumCount += d.count;
    });

    // Rango comercial visible: 06:00 a 22:00 (o 0 a 23 si hay ventas fuera)
    const minH = data.some(d => d.hour < 6 && d.total > 0) ? 0 : 6;
    const maxH = data.some(d => d.hour > 22 && d.total > 0) ? 23 : 22;

    const list = [];
    let maxHourItem: any = null;
    let maxCountItem: any = null;
    let activeHCount = 0;

    // Franjas horarias acumuladas
    let morningAmount = 0, morningCount = 0;
    let afternoonAmount = 0, afternoonCount = 0;
    let eveningAmount = 0, eveningCount = 0;

    for (let h = minH; h <= maxH; h++) {
      const match = hourMap.get(h);
      const total = match ? match.total : 0;
      const count = match ? match.count : 0;
      const hourAvgTicket = count > 0 ? total / count : 0;
      const percentage = sumAmount > 0 ? (total / sumAmount) * 100 : 0;
      const hFmt = format12Hour(h);

      if (total > 0 || count > 0) activeHCount++;

      const item = {
        hour: h,
        label: hFmt.short,
        displayHour: hFmt.short,
        range: hFmt.range,
        total,
        count,
        avgTicket: hourAvgTicket,
        percentage
      };

      if (!maxHourItem || total > maxHourItem.total) {
        maxHourItem = item;
      }
      if (!maxCountItem || count > maxCountItem.count) {
        maxCountItem = item;
      }

      // Agrupar por franjas
      if (h >= 6 && h < 12) {
        morningAmount += total;
        morningCount += count;
      } else if (h >= 12 && h < 18) {
        afternoonAmount += total;
        afternoonCount += count;
      } else {
        eveningAmount += total;
        eveningCount += count;
      }

      list.push(item);
    }

    const slots = [
      {
        id: 'morning',
        name: 'Mañana',
        range: '06:00 AM - 11:59 AM',
        icon: <Sunrise size={14} className="text-amber-500" />,
        amount: morningAmount,
        count: morningCount,
        percentage: sumAmount > 0 ? (morningAmount / sumAmount) * 100 : 0,
        colorBg: 'bg-amber-500/10 text-amber-700 border-amber-200/60'
      },
      {
        id: 'afternoon',
        name: 'Tarde',
        range: '12:00 PM - 05:59 PM',
        icon: <Sun size={14} className="text-orange-500" />,
        amount: afternoonAmount,
        count: afternoonCount,
        percentage: sumAmount > 0 ? (afternoonAmount / sumAmount) * 100 : 0,
        colorBg: 'bg-orange-500/10 text-orange-700 border-orange-200/60'
      },
      {
        id: 'evening',
        name: 'Noche',
        range: '06:00 PM - 10:59 PM',
        icon: <Moon size={14} className="text-indigo-500" />,
        amount: eveningAmount,
        count: eveningCount,
        percentage: sumAmount > 0 ? (eveningAmount / sumAmount) * 100 : 0,
        colorBg: 'bg-indigo-500/10 text-indigo-700 border-indigo-200/60'
      }
    ];

    const dominant = [...slots].sort((a, b) => b.amount - a.amount)[0];

    return {
      hourlyData: list,
      peakHour: maxHourItem && maxHourItem.total > 0 ? maxHourItem : null,
      peakCountHour: maxCountItem && maxCountItem.count > 0 ? maxCountItem : null,
      totalAmount: sumAmount,
      totalCount: sumCount,
      avgTicket: sumCount > 0 ? sumAmount / sumCount : 0,
      timeSlots: slots,
      dominantSlot: dominant?.amount > 0 ? dominant : null,
      activeHoursCount: activeHCount
    };
  }, [data]);

  // Tooltip personalizado para el gráfico
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPeak = peakHour && d.hour === peakHour.hour;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Clock size={12} className="text-indigo-400" />
              {d.range}
            </span>
            {isPeak && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Flame size={10} /> Pico
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Venta:</span>
              <span className="font-extrabold text-white text-sm tabular-nums">
                {formatCurrency(d.total)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Comprobantes:</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {d.count} {d.count === 1 ? 'emitido' : 'emitidos'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Ticket Promedio:</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {formatCurrency(d.avgTicket)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[10px]">
              <span className="text-slate-400">% del día:</span>
              <span className="font-bold text-indigo-300 tabular-nums">
                {d.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-6 bg-slate-100 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-700">
      
      {/* Header del Card */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/60 shadow-xs">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              Análisis Estadístico de Ventas por Hora
              {peakHour && (
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Flame size={10} className="text-amber-500" /> Pico: {peakHour.displayHour}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Distribución de ingresos, horas de mayor afluencia y volumen de emisión.
            </p>
          </div>
        </div>

        {/* Selector de Vista: Gráfico vs Tabla */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('chart')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'chart'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={13} />
            Gráfico
          </button>
          <button
            type="button"
            onClick={() => setActiveView('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'table'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon size={13} />
            Tabla
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        
        {/* 4 KPIs Clave de Comportamiento Horario */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Hora Pico */}
          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-amber-100/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                Hora Pico de Venta
              </span>
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-700">
                <Flame size={12} />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-base font-black text-slate-900">
                {peakHour ? peakHour.displayHour : 'Sin datos'}
              </div>
              <div className="text-[11px] font-semibold text-amber-700 mt-0.5 tabular-nums">
                {peakHour ? `${formatCurrency(peakHour.total)} (${peakHour.percentage.toFixed(1)}%)` : '-'}
              </div>
            </div>
          </div>

          {/* Mayor Afluencia (# tickets) */}
          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-blue-100/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800">
                Mayor Afluencia
              </span>
              <div className="p-1 rounded-md bg-blue-500/20 text-blue-700">
                <Receipt size={12} />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-base font-black text-slate-900">
                {peakCountHour ? peakCountHour.displayHour : 'Sin datos'}
              </div>
              <div className="text-[11px] font-semibold text-blue-700 mt-0.5 tabular-nums">
                {peakCountHour ? `${peakCountHour.count} operaciones` : '-'}
              </div>
            </div>
          </div>

          {/* Ticket Promedio */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                Ticket Promedio
              </span>
              <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-700">
                <TrendingUp size={12} />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-base font-black text-slate-900 tabular-nums">
                {formatCurrency(avgTicket)}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                {totalCount} operaciones totales
              </div>
            </div>
          </div>

          {/* Franja Dominante */}
          <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">
                Franja Dominante
              </span>
              <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-700">
                <Zap size={12} />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-base font-black text-slate-900">
                {dominantSlot ? dominantSlot.name : 'Sin datos'}
              </div>
              <div className="text-[11px] font-semibold text-indigo-700 mt-0.5 tabular-nums">
                {dominantSlot ? `${formatCurrency(dominantSlot.amount)} (${dominantSlot.percentage.toFixed(0)}%)` : '-'}
              </div>
            </div>
          </div>

        </div>

        {/* Vista Gráfico */}
        {activeView === 'chart' && (
          <div className="space-y-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hourlyData}
                  margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(val) => `S/.${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                  <Bar dataKey="total" radius={[6, 6, 2, 2]}>
                    {hourlyData.map((entry) => {
                      const isPeak = peakHour && entry.hour === peakHour.hour;
                      const hasSales = entry.total > 0;
                      return (
                        <Cell
                          key={`cell-${entry.hour}`}
                          fill={isPeak ? '#4f46e5' : hasSales ? '#818cf8' : '#e2e8f0'}
                          fillOpacity={isPeak ? 1 : hasSales ? 0.85 : 0.4}
                          className="transition-all duration-300 cursor-pointer hover:opacity-100"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3 Franjas Horarias (Timeline Pills) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              {timeSlots.map((slot) => (
                <div 
                  key={slot.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white shadow-xs border border-slate-200/60 shrink-0">
                      {slot.icon}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800">{slot.name}</span>
                      <span className="text-[10px] text-slate-400 block">{slot.range}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 block tabular-nums">
                      {formatCurrency(slot.amount)}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 tabular-nums">
                      {slot.percentage.toFixed(1)}% · {slot.count} ops
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista Tabla Detallada */}
        {activeView === 'table' && (
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Franja Horaria</th>
                  <th className="py-2.5 px-3 text-center">Nivel</th>
                  <th className="py-2.5 px-3 text-right">Comprobantes</th>
                  <th className="py-2.5 px-3 text-right">Ticket Promedio</th>
                  <th className="py-2.5 px-4 text-right">% Día</th>
                  <th className="py-2.5 px-4 text-right">Total Facturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {hourlyData.filter(d => d.total > 0 || d.count > 0).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No se registraron ventas en las horas de este periodo.
                    </td>
                  </tr>
                ) : (
                  hourlyData.map((d) => {
                    const isPeak = peakHour && d.hour === peakHour.hour;
                    let intensityBadge = <span className="text-[10px] text-slate-400">Inactivo</span>;
                    if (isPeak) {
                      intensityBadge = <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">🔥 Pico</span>;
                    } else if (d.percentage >= 15) {
                      intensityBadge = <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Alto</span>;
                    } else if (d.percentage >= 5) {
                      intensityBadge = <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-100">Medio</span>;
                    } else if (d.total > 0) {
                      intensityBadge = <span className="px-2 py-0.5 rounded-full text-[9px] text-slate-600 bg-slate-100">Bajo</span>;
                    }

                    return (
                      <tr 
                        key={d.hour} 
                        className={`transition-colors ${
                          isPeak 
                            ? 'bg-amber-50/40 font-semibold text-slate-900' 
                            : 'hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          {d.range}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {intensityBadge}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                          {d.count} {d.count === 1 ? 'doc' : 'docs'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                          {formatCurrency(d.avgTicket)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-indigo-600">
                          {d.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                          {formatCurrency(d.total)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};
