import React, { useState, useEffect, useMemo } from 'react';
import { Target, Calendar, GitCompare, Layout } from 'lucide-react';
import { ComparisonChart } from '../components/charts/ComparisonChart';
import { formatCurrency } from '../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../hooks/useFilters';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import api, { salesService } from '../services/api';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { useHeaderStore } from '../hooks/useHeader';
import { BranchSelector } from '../components/filters/BranchSelector';
import { SellerSelector } from '../components/filters/SellerSelector';
import { Skeleton } from '../components/ui/Skeleton';

export const ComparatorPage: React.FC = () => {
  const { companyId, branch, seller } = useFilters();

  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  useEffect(() => {
    setHeader(
      'Comparador de Períodos',
      'Analice el rendimiento actual frente a períodos anteriores con filtros a medida.'
    );
    return () => clearHeader();
  }, [companyId]);

  // Default dates: This month vs Last month
  const today = new Date();
  const [p1Start, setP1Start] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [p1End, setP1End] = useState(format(today, 'yyyy-MM-dd'));
  
  const lastMonth = subMonths(today, 1);
  const [p2Start, setP2Start] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [p2End, setP2End] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

  // Fetch period comparison metrics
  const { data: compareData, isLoading: loadingCompare } = useQuery({
    queryKey: ['compare-periods', companyId, p1Start, p1End, p2Start, p2End, branch, seller],
    queryFn: async () => {
      const { data } = await api.get('/analytics/compare', {
        params: { companyId, p1Start, p1End, p2Start, p2End, branch, seller }
      });
      return data;
    },
    enabled: !!companyId
  });

  // Fetch trend for period 1
  const { data: trend1 = [], isLoading: loadingTrend1 } = useQuery({
    queryKey: ['compare-trend-1', companyId, p1Start, p1End, branch, seller],
    queryFn: () => salesService.getTrend({ companyId, dateStart: p1Start, dateEnd: p1End, granularity: 'day', branch, seller }),
    enabled: !!companyId
  });

  // Fetch trend for period 2
  const { data: trend2 = [], isLoading: loadingTrend2 } = useQuery({
    queryKey: ['compare-trend-2', companyId, p2Start, p2End, branch, seller],
    queryFn: () => salesService.getTrend({ companyId, dateStart: p2Start, dateEnd: p2End, granularity: 'day', branch, seller }),
    enabled: !!companyId
  });

  // Prepare chart data by mapping indexes (Día 1, Día 2, etc.)
  const maxLength = Math.max(trend1.length, trend2.length);
  const chartData = Array.from({ length: maxLength }).map((_, idx) => {
    const t1 = trend1[idx];
    const t2 = trend2[idx];
    return {
      date: `Día ${idx + 1}`,
      current: t1 ? parseFloat(t1.total || 0) : 0,
      previous: t2 ? parseFloat(t2.total || 0) : 0
    };
  });

  const tableData = useMemo(() => {
    if (!compareData) return [];
    
    const getPercent = (p1Val: number, p2Val: number) => {
      if (p2Val === 0) return p1Val > 0 ? 100 : 0;
      return ((p1Val - p2Val) / p2Val) * 100;
    };

    const p1 = compareData.period1 || {};
    const p2 = compareData.period2 || {};

    return [
      { 
        metric: 'Ventas Totales', 
        period1: p1.total || 0, 
        period2: p2.total || 0, 
        percent: compareData.percentageChange || 0 
      },
      { 
        metric: 'Documentos Emitidos', 
        period1: p1.count || 0, 
        period2: p2.count || 0, 
        percent: getPercent(p1.count || 0, p2.count || 0) 
      },
      { 
        metric: 'CPE (Facturas/Boletas)', 
        period1: p1.cpeTotal || 0, 
        period2: p2.cpeTotal || 0, 
        percent: getPercent(p1.cpeTotal || 0, p2.cpeTotal || 0) 
      },
      { 
        metric: 'NV (Notas de Venta)', 
        period1: p1.notesTotal || 0, 
        period2: p2.notesTotal || 0, 
        percent: getPercent(p1.notesTotal || 0, p2.notesTotal || 0) 
      },
      { 
        metric: 'Productos', 
        period1: p1.productsTotal || 0, 
        period2: p2.productsTotal || 0, 
        percent: getPercent(p1.productsTotal || 0, p2.productsTotal || 0) 
      },
      { 
        metric: 'Servicios', 
        period1: p1.servicesTotal || 0, 
        period2: p2.servicesTotal || 0, 
        percent: getPercent(p1.servicesTotal || 0, p2.servicesTotal || 0) 
      },
      { 
        metric: 'Ticket Promedio', 
        period1: p1.avgTicket || 0, 
        period2: p2.avgTicket || 0, 
        percent: getPercent(p1.avgTicket || 0, p2.avgTicket || 0) 
      },
    ];
  }, [compareData]);

  const renderChangeBadge = (val: number) => {
    const isPositive = val > 0;
    const isZero = val === 0;
    
    const bg = isZero ? 'bg-slate-100 text-slate-500' : isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100';
    const sign = isZero ? '' : isPositive ? '+' : '';
    
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${bg}`}>
        {sign}{val.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ─── Filter Panel ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Custom selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <BranchSelector />
          <SellerSelector />
        </div>
        
        {/* Dual period selectors */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Actual (P1):</span>
            <CustomDatePicker
              dateStart={p1Start}
              dateEnd={p1End}
              onChange={(start, end) => { setP1Start(start); setP1End(end); }}
              className="w-full sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Anterior (P2):</span>
            <CustomDatePicker
              dateStart={p2Start}
              dateEnd={p2End}
              onChange={(start, end) => { setP2Start(start); setP2End(end); }}
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      {loadingCompare ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : compareData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Ventas */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Totales</span>
              {renderChangeBadge(compareData.percentageChange || 0)}
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800 block tabular-nums">{formatCurrency(compareData.period1?.total || 0)}</span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Período anterior: <span className="font-semibold text-slate-600">{formatCurrency(compareData.period2?.total || 0)}</span>
              </span>
            </div>
          </div>

          {/* Card 2: Operaciones */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operaciones</span>
              {renderChangeBadge(
                ((compareData.period1?.count || 0) === 0 && (compareData.period2?.count || 0) === 0)
                  ? 0 
                  : (compareData.period2?.count || 0) === 0 
                    ? 100 
                    : (((compareData.period1?.count || 0) - (compareData.period2?.count || 0)) / (compareData.period2?.count || 1)) * 100
              )}
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800 block tabular-nums">{compareData.period1?.count || 0} ops</span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Período anterior: <span className="font-semibold text-slate-600">{compareData.period2?.count || 0} ops</span>
              </span>
            </div>
          </div>

          {/* Card 3: Ticket Promedio */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Promedio</span>
              {renderChangeBadge(
                ((compareData.period1?.avgTicket || 0) === 0 && (compareData.period2?.avgTicket || 0) === 0)
                  ? 0 
                  : (compareData.period2?.avgTicket || 0) === 0 
                    ? 100 
                    : (((compareData.period1?.avgTicket || 0) - (compareData.period2?.avgTicket || 0)) / (compareData.period2?.avgTicket || 1)) * 100
              )}
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-800 block tabular-nums">{formatCurrency(compareData.period1?.avgTicket || 0)}</span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Período anterior: <span className="font-semibold text-slate-600">{formatCurrency(compareData.period2?.avgTicket || 0)}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Evolution Chart & Breakdown Table ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column (2/3 width) */}
        <div className="lg:col-span-2">
          <ComparisonChart data={chartData} isLoading={loadingTrend1 || loadingTrend2} />
        </div>

        {/* Detailed Table Column (1/3 width) */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full hover:border-slate-300 transition-colors">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm">Detalle de Variaciones</h3>
            <p className="text-[10px] text-slate-400 font-medium">Comparación desglosada de las métricas clave.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingCompare ? (
              <div className="p-5 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : tableData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Sin datos para mostrar</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[9px]">Métrica</th>
                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[9px] text-right">P1 (Act)</th>
                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[9px] text-right">P2 (Ant)</th>
                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[9px] text-right">Var.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableData.map((row, idx) => {
                    const isPositive = row.percent > 0;
                    const isZero = row.percent === 0;
                    const varColor = isZero ? 'text-slate-400' : isPositive ? 'text-emerald-600' : 'text-rose-600';
                    const varBg = isZero ? 'bg-slate-50' : isPositive ? 'bg-emerald-50/30' : 'bg-rose-50/30';
                    const sign = isZero ? '' : isPositive ? '+' : '';

                    const isCount = row.metric === 'Documentos Emitidos';
                    const fmt = (v: number) => isCount ? v.toString() : formatCurrency(v);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-700 text-[11px]">{row.metric}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800 text-[11px] tabular-nums">{fmt(row.period1)}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-400 text-[11px] tabular-nums">{fmt(row.period2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-[11px] tabular-nums">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${varColor} ${varBg}`}>
                            {sign}{row.percent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
