import React, { useState } from 'react';
import { GitCompare, Calendar } from 'lucide-react';
import { ComparisonChart } from '../components/charts/ComparisonChart';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../hooks/useFilters';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import api, { salesService } from '../services/api';
import { useAuthStore } from '../hooks/useAuth';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';

export const ComparatorPage: React.FC = () => {
  const { companyId } = useFilters();
  const token = useAuthStore((state) => state.accessToken);

  // Default dates: This month vs Last month
  const today = new Date();
  const [p1Start, setP1Start] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [p1End, setP1End] = useState(format(today, 'yyyy-MM-dd'));
  
  const lastMonth = subMonths(today, 1);
  const [p2Start, setP2Start] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [p2End, setP2End] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

  // Fetch period comparison metrics
  const { data: compareData, isLoading: loadingCompare } = useQuery({
    queryKey: ['compare-periods', companyId, p1Start, p1End, p2Start, p2End],
    queryFn: async () => {
      const { data } = await api.get('/analytics/compare', {
        params: { companyId, p1Start, p1End, p2Start, p2End }
      });
      return data;
    },
    enabled: !!companyId
  });

  // Fetch trend for period 1
  const { data: trend1 = [], isLoading: loadingTrend1 } = useQuery({
    queryKey: ['compare-trend-1', companyId, p1Start, p1End],
    queryFn: () => salesService.getTrend({ companyId, dateStart: p1Start, dateEnd: p1End, granularity: 'day' }),
    enabled: !!companyId
  });

  // Fetch trend for period 2
  const { data: trend2 = [], isLoading: loadingTrend2 } = useQuery({
    queryKey: ['compare-trend-2', companyId, p2Start, p2End],
    queryFn: () => salesService.getTrend({ companyId, dateStart: p2Start, dateEnd: p2End, granularity: 'day' }),
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

  const tableData = compareData ? [
    { 
      metric: 'Ventas Totales', 
      period1: compareData.period1.total, 
      period2: compareData.period2.total, 
      diff: compareData.difference, 
      percent: compareData.percentageChange 
    },
    { 
      metric: 'Documentos Emitidos', 
      period1: compareData.period1.count, 
      period2: compareData.period2.count, 
      diff: compareData.period1.count - compareData.period2.count, 
      percent: compareData.period2.count === 0 ? 0 : ((compareData.period1.count - compareData.period2.count) / compareData.period2.count) * 100 
    },
    { 
      metric: 'Ticket Promedio', 
      period1: compareData.period1.avgTicket, 
      period2: compareData.period2.avgTicket, 
      diff: compareData.period1.avgTicket - compareData.period2.avgTicket, 
      percent: compareData.period2.avgTicket === 0 ? 0 : ((compareData.period1.avgTicket - compareData.period2.avgTicket) / compareData.period2.avgTicket) * 100 
    },
  ] : [];

  const columns = [
    { header: 'Métrica', key: 'metric' },
    { 
      header: 'Período Actual', 
      key: 'period1',
      render: (item: any) => <span className="font-medium text-neutral-900">{item.metric === 'Documentos Emitidos' ? item.period1 : formatCurrency(item.period1)}</span>
    },
    { 
      header: 'Período Anterior', 
      key: 'period2',
      render: (item: any) => <span className="text-neutral-600">{item.metric === 'Documentos Emitidos' ? item.period2 : formatCurrency(item.period2)}</span>
    },
    { 
      header: 'Diferencia', 
      key: 'diff',
      render: (item: any) => {
        const val = item.diff;
        return (
          <span className={`font-medium ${val > 0 ? 'text-success' : val < 0 ? 'text-danger' : 'text-neutral-600'}`}>
            {val > 0 ? '+' : ''}{item.metric === 'Documentos Emitidos' ? val : formatCurrency(val)}
          </span>
        );
      }
    },
    { 
      header: 'Variación %', 
      key: 'percent',
      render: (item: any) => {
        const val = item.percent;
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold ${val > 0 ? 'bg-success-light text-success-dark' : val < 0 ? 'bg-danger-light text-danger-dark' : 'bg-neutral-100 text-neutral-600'}`}>
            {formatPercent(val)}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <GitCompare className="text-primary" /> Comparador de Períodos
          </h2>
          <p className="text-sm text-neutral-500 mt-1">Analice el rendimiento actual frente a períodos anteriores.</p>
        </div>
      </div>

      {/* Date Selectors for both periods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200/80">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Período Actual (P1)
          </label>
          <CustomDatePicker
            dateStart={p1Start}
            dateEnd={p1End}
            onChange={(start, end) => {
              setP1Start(start);
              setP1End(end);
            }}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Período Anterior (P2)
          </label>
          <CustomDatePicker
            dateStart={p2Start}
            dateEnd={p2End}
            onChange={(start, end) => {
              setP2Start(start);
              setP2End(end);
            }}
            className="w-full"
          />
        </div>
      </div>

      <div className="card p-5">
        <ComparisonChart data={chartData} isLoading={loadingTrend1 || loadingTrend2} />
      </div>

      <div className="card">
        <div className="p-4 bg-neutral-50">
          <h3 className="font-semibold text-neutral-900">Detalle de Variaciones</h3>
        </div>
        <div className="p-4">
          <DataTable title="Detalle de Variaciones" columns={columns} data={tableData} isLoading={loadingCompare} />
        </div>
      </div>
    </div>
  );
};
