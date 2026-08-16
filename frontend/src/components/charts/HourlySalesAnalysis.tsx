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
  Percent,
  Sparkles,
  Activity
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
        gradient: 'from-amber-500/10 to-transparent',
        accentColor: 'text-amber-600',
        barColor: 'bg-amber-500'
      },
      {
        id: 'afternoon',
        name: 'Tarde',
        range: '12:00 PM - 05:59 PM',
        icon: <Sun size={14} className="text-orange-500" />,
        amount: afternoonAmount,
        count: afternoonCount,
        percentage: sumAmount > 0 ? (afternoonAmount / sumAmount) * 100 : 0,
        gradient: 'from-orange-500/10 to-transparent',
        accentColor: 'text-orange-600',
        barColor: 'bg-orange-500'
      },
      {
        id: 'evening',
        name: 'Noche',
        range: '06:00 PM - 10:59 PM',
        icon: <Moon size={14} className="text-indigo-500" />,
        amount: eveningAmount,
        count: eveningCount,
        percentage: sumAmount > 0 ? (eveningAmount / sumAmount) * 100 : 0,
        gradient: 'from-indigo-500/10 to-transparent',
        accentColor: 'text-indigo-600',
        barColor: 'bg-indigo-500'
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

  // Tooltip ultra-moderno
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPeak = peakHour && d.hour === peakHour.hour;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 min-w-[210px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Clock size={13} className="text-indigo-400" />
              {d.range}
            </span>
            {isPeak && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs flex items-center gap-1">
                <Flame size={10} /> Hora Pico
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Venta:</span>
              <span className="font-black text-white text-base tabular-nums">
                {formatCurrency(d.total)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Comprobantes:</span>
              <span className="font-bold text-slate-200 tabular-nums">
                {d.count} {d.count === 1 ? 'operación' : 'operaciones'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Ticket Promedio:</span>
              <span className="font-semibold text-slate-300 tabular-nums">
                {formatCurrency(d.avgTicket)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">% de la Venta Diaria:</span>
              <span className="font-extrabold text-indigo-400 tabular-nums">
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
        <div className="h-6 bg-slate-100 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-700 flex flex-col justify-between">
      
      {/* Header del Card */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white rounded-2xl shadow-sm">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
              Análisis Estadístico de Ventas por Hora
              {peakHour && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                  <Flame size={11} className="text-amber-500" /> Pico: {peakHour.displayHour}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Distribución de ingresos, horas de mayor afluencia y volumen horario
            </p>
          </div>
        </div>

        {/* Selector de Vista: Gráfico vs Tabla */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl shrink-0 border border-slate-200/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveView('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'chart'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={13} />
            Gráfico
          </button>
          <button
            type="button"
            onClick={() => setActiveView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'table'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon size={13} />
            Tabla
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        
        {/* 4 KPIs Clave de Comportamiento Horario */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Hora Pico */}
          <div className="p-4 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white relative overflow-hidden shadow-2xs">
            <Flame size={54} className="absolute -bottom-3 -right-2 text-amber-500/10 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                Hora Pico de Venta
              </span>
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-800">
                <Flame size={12} />
              </div>
            </div>
            <div className="mt-2 relative z-10">
              <div className="text-xl font-black text-slate-900">
                {peakHour ? peakHour.displayHour : 'Sin datos'}
              </div>
              <div className="text-[11px] font-bold text-amber-800 mt-0.5 tabular-nums">
                {peakHour ? `${formatCurrency(peakHour.total)} (${peakHour.percentage.toFixed(0)}%)` : '-'}
              </div>
            </div>
          </div>

          {/* Mayor Afluencia (# tickets) */}
          <div className="p-4 rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-500/10 via-blue-50/40 to-white relative overflow-hidden shadow-2xs">
            <Receipt size={54} className="absolute -bottom-3 -right-2 text-blue-500/10 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">
                Mayor Afluencia
              </span>
              <div className="p-1 rounded-lg bg-blue-500/20 text-blue-800">
                <Receipt size={12} />
              </div>
            </div>
            <div className="mt-2 relative z-10">
              <div className="text-xl font-black text-slate-900">
                {peakCountHour ? peakCountHour.displayHour : 'Sin datos'}
              </div>
              <div className="text-[11px] font-bold text-blue-800 mt-0.5 tabular-nums">
                {peakCountHour ? `${peakCountHour.count} operaciones` : '-'}
              </div>
            </div>
          </div>

          {/* Ticket Promedio */}
          <div className="p-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/10 via-emerald-50/40 to-white relative overflow-hidden shadow-2xs">
            <TrendingUp size={54} className="absolute -bottom-3 -right-2 text-emerald-500/10 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                Ticket Promedio
              </span>
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-800">
                <TrendingUp size={12} />
              </div>
            </div>
            <div className="mt-2 relative z-10">
              <div className="text-xl font-black text-slate-900 tabular-nums">
                {formatCurrency(avgTicket)}
              </div>
              <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                {totalCount} operaciones totales
              </div>
            </div>
          </div>

          {/* Franja Dominante */}
          <div className="p-4 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-500/10 via-indigo-50/40 to-white relative overflow-hidden shadow-2xs">
            <Zap size={54} className="absolute -bottom-3 -right-2 text-indigo-500/10 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">
                Franja Dominante
              </span>
              <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-800">
                <Zap size={12} />
              </div>
            </div>
            <div className="mt-2 relative z-10">
              <div className="text-xl font-black text-slate-900">
                {dominantSlot ? dominantSlot.name : 'Sin datos'}
              </div>
              <div className="text-[11px] font-bold text-indigo-800 mt-0.5 tabular-nums">
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
                  margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    {/* Gradiente para la hora pico */}
                    <linearGradient id="peakHourBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.85} />
                    </linearGradient>
                    {/* Gradiente para horas con venta normal */}
                    <linearGradient id="activeHourBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    tickFormatter={(val) => `S/.${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                  <Bar dataKey="total" radius={[8, 8, 3, 3]}>
                    {hourlyData.map((entry) => {
                      const isPeak = peakHour && entry.hour === peakHour.hour;
                      const hasSales = entry.total > 0;
                      return (
                        <Cell
                          key={`cell-${entry.hour}`}
                          fill={isPeak ? 'url(#peakHourBar)' : hasSales ? 'url(#activeHourBar)' : '#f1f5f9'}
                          fillOpacity={isPeak ? 1 : hasSales ? 0.9 : 0.5}
                          className="transition-all duration-300 cursor-pointer hover:opacity-100"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3 Franjas Horarias (Timeline Cards con barras) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              {timeSlots.map((slot) => {
                const isDominant = dominantSlot && slot.id === dominantSlot.id;
                return (
                  <div 
                    key={slot.id} 
                    className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                      isDominant 
                        ? 'bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-indigo-200/90 shadow-2xs' 
                        : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-white shadow-2xs border border-slate-200/60 shrink-0">
                          {slot.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800">{slot.name}</span>
                            {isDominant && (
                              <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Principal
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium block">{slot.range}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block tabular-nums">
                          {formatCurrency(slot.amount)}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600 tabular-nums">
                          {slot.percentage.toFixed(0)}% · {slot.count} ops
                        </span>
                      </div>
                    </div>

                    {/* Progress bar de la franja */}
                    <div className="w-full h-1.5 rounded-full bg-slate-200/60 mt-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDominant ? 'bg-gradient-to-r from-indigo-500 to-violet-600' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, slot.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vista Tabla Detallada y Elegante */}
        {activeView === 'table' && (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Franja Horaria</th>
                    <th className="py-3 px-3 text-center">Nivel</th>
                    <th className="py-3 px-3 text-right">Comprobantes</th>
                    <th className="py-3 px-3 text-right">Ticket Promedio</th>
                    <th className="py-3 px-4 text-right min-w-[130px]">% del Día</th>
                    <th className="py-3 px-4 text-right">Total Facturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {hourlyData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-medium">
                        No se registraron ventas en este periodo.
                      </td>
                    </tr>
                  ) : (
                    hourlyData.map((d) => {
                      const isPeak = peakHour && d.hour === peakHour.hour;
                      const hasSales = d.total > 0 || d.count > 0;

                      let intensityBadge = (
                        <span className="text-[10px] text-slate-400 font-medium">—</span>
                      );

                      if (isPeak) {
                        intensityBadge = (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs inline-flex items-center gap-1">
                            <Flame size={10} /> Pico
                          </span>
                        );
                      } else if (d.percentage >= 10) {
                        intensityBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            Alto
                          </span>
                        );
                      } else if (d.percentage >= 3) {
                        intensityBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
                            Medio
                          </span>
                        );
                      } else if (hasSales) {
                        intensityBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[9px] text-slate-600 bg-slate-100 border border-slate-200/60 font-medium">
                            Bajo
                          </span>
                        );
                      }

                      return (
                        <tr 
                          key={d.hour} 
                          className={`transition-colors ${
                            isPeak 
                              ? 'bg-amber-50/60 font-semibold text-slate-900 border-l-4 border-l-amber-500' 
                              : hasSales 
                              ? 'hover:bg-indigo-50/30 text-slate-700 bg-white' 
                              : 'text-slate-400 opacity-50 hover:opacity-100 hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Franja Horaria */}
                          <td className="py-2.5 px-4 font-bold text-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isPeak ? 'bg-amber-500' : hasSales ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                              <span>{d.range}</span>
                            </div>
                          </td>

                          {/* Nivel / Badge */}
                          <td className="py-2.5 px-3 text-center">
                            {intensityBadge}
                          </td>

                          {/* Comprobantes */}
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-700">
                            {hasSales ? (
                              <span>{d.count} {d.count === 1 ? 'doc' : 'docs'}</span>
                            ) : (
                              <span className="text-slate-300">0 docs</span>
                            )}
                          </td>

                          {/* Ticket Promedio */}
                          <td className="py-2.5 px-3 text-right tabular-nums font-medium text-slate-600">
                            {hasSales ? formatCurrency(d.avgTicket) : <span className="text-slate-300">S/. 0.00</span>}
                          </td>

                          {/* % Día con Barra */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`tabular-nums text-[11px] font-extrabold ${isPeak ? 'text-amber-800' : hasSales ? 'text-indigo-700' : 'text-slate-300'}`}>
                                {d.percentage.toFixed(1)}%
                              </span>
                              {hasSales && (
                                <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                  <div 
                                    className={`h-full rounded-full ${isPeak ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${Math.min(100, d.percentage)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Total Facturado */}
                          <td className={`py-2.5 px-4 text-right tabular-nums ${isPeak ? 'font-black text-slate-900 text-sm' : hasSales ? 'font-extrabold text-slate-800 text-xs' : 'font-medium text-slate-300'}`}>
                            {formatCurrency(d.total)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Footer Total */}
                <tfoot>
                  <tr className="bg-slate-800 text-white">
                    <td className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-200">
                      Total Consolidado
                    </td>
                    <td className="py-3 px-3 text-center text-[10px] font-bold text-slate-300">
                      {activeHoursCount} {activeHoursCount === 1 ? 'hora activa' : 'horas activas'}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold tabular-nums text-slate-100">
                      {totalCount} {totalCount === 1 ? 'doc' : 'docs'}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold tabular-nums text-slate-200">
                      {formatCurrency(avgTicket)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-black text-indigo-300">
                      100.0%
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-black tabular-nums text-white">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
