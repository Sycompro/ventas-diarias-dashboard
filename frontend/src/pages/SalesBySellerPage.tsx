import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Target, 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  Building2,
  TrendingUp
} from 'lucide-react';
import { useSalesBySeller } from '../hooks/useSalesMetrics';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Skeleton } from '../components/ui/Skeleton';
import { useHeaderStore } from '../hooks/useHeader';
import { GlobalFilters } from '../components/filters/GlobalFilters';

export const SalesBySellerPage: React.FC = () => {
  const { data, isLoading } = useSalesBySeller();
  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  useEffect(() => {
    setHeader(
      'Ventas por Usuario',
      'Análisis del rendimiento y productividad de los vendedores registrados.'
    );
    return () => clearHeader();
  }, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'avgTicket'>('total');

  // Calcular métricas clave (KPIs)
  const kpis = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const sortedByTotal = [...data].sort((a: any, b: any) => b.total - a.total);
    const topSeller = sortedByTotal[0];

    let totalSales = 0;
    let totalOps = 0;
    let maxOpsSeller = data[0];

    data.forEach((s: any) => {
      totalSales += s.total;
      totalOps += s.count;
      if (s.count > maxOpsSeller.count) {
        maxOpsSeller = s;
      }
    });

    const avgTicket = totalOps > 0 ? totalSales / totalOps : 0;

    return {
      topSeller,
      totalSales,
      totalOps,
      maxOpsSeller,
      avgTicket
    };
  }, [data]);

  // Filtrar y ordenar datos
  const processedData = useMemo(() => {
    if (!data) return [];
    
    return data
      .filter((s: any) => {
        const name = (s.name || s.sellerName || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'total') return b.total - a.total;
        if (sortBy === 'count') return b.count - a.count;
        if (sortBy === 'avgTicket') return b.avgTicket - a.avgTicket;
        return 0;
      });
  }, [data, searchTerm, sortBy]);

  // Find max total for proportional bar
  const maxTotal = useMemo(() => {
    if (!processedData.length) return 1;
    return Math.max(...processedData.map((s: any) => s.total || 0), 1);
  }, [processedData]);

  const columns = useMemo(() => [
    { 
      header: 'Usuario', 
      key: 'name',
      render: (item: any) => {
        const rank = processedData.findIndex((s: any) => (s.name || s.sellerName) === (item.name || item.sellerName)) + 1;
        
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

        const avatarBg = rank === 1 ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-300' 
                       : rank === 2 ? 'bg-gradient-to-br from-slate-500 to-slate-600 text-white border-slate-300'
                       : rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white border-orange-300'
                       : 'bg-slate-100 text-slate-500 border-slate-200';

        const initials = (item.name || item.sellerName || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

        return (
          <div className="flex items-center gap-2">
            {/* Rank number */}
            <span className="w-5 text-right font-black text-[11px] text-slate-400 tabular-nums shrink-0">
              {rank}°
            </span>
            <div className="relative shrink-0">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-[11px] shadow-sm ${avatarBg}`}>
                {initials}
              </div>
              {medal && (
                <span className="absolute -top-1.5 -right-1.5 text-sm leading-none drop-shadow-sm">{medal}</span>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 block text-[11px] truncate leading-tight">{item.name || item.sellerName}</span>
              <span className="text-[9px] text-slate-400 leading-tight">{item.count} operaciones</span>
            </div>
          </div>
        );
      }
    },
    { 
      header: 'Total Vendido', 
      key: 'total',
      render: (item: any) => {
        const rank = processedData.findIndex((s: any) => (s.name || s.sellerName) === (item.name || item.sellerName)) + 1;
        const pct = maxTotal > 0 ? ((item.total || 0) / maxTotal) * 100 : 0;
        return (
          <div className="min-w-[120px]">
            <span className={`text-[13px] font-extrabold tabular-nums block mb-1 ${rank === 1 ? 'text-indigo-600' : 'text-slate-800'}`}>
              {formatCurrency(item.total)}
            </span>
            <div className="w-full bg-slate-100 rounded-full h-[5px] overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${rank === 1 ? 'bg-indigo-500' : rank === 2 ? 'bg-indigo-400' : rank === 3 ? 'bg-indigo-300' : 'bg-slate-300'}`}
                style={{ width: `${pct}%` }} 
              />
            </div>
          </div>
        );
      }
    },
    { 
      header: 'CPE', 
      key: 'cpeTotal',
      render: (item: any) => {
        const val = item.cpeTotal || 0;
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums ${val > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400'}`}>
            {val > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            {formatCurrency(val)}
          </div>
        );
      }
    },
    { 
      header: 'Notas Venta', 
      key: 'notesTotal',
      render: (item: any) => {
        const val = item.notesTotal || 0;
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums ${val > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-400'}`}>
            {val > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            {formatCurrency(val)}
          </div>
        );
      }
    },
    { 
      header: 'Productos', 
      key: 'productsTotal',
      render: (item: any) => {
        const val = item.productsTotal || 0;
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums ${val > 0 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-50 text-slate-400'}`}>
            {val > 0 && <span className="w-1.5 h-1.5 rounded-sm bg-blue-500" />}
            {formatCurrency(val)}
          </div>
        );
      }
    },
    { 
      header: 'Servicios', 
      key: 'servicesTotal',
      render: (item: any) => {
        const val = item.servicesTotal || 0;
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums ${val > 0 ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'bg-slate-50 text-slate-400'}`}>
            {val > 0 && <span className="w-1.5 h-1.5 rounded-sm bg-violet-500" />}
            {formatCurrency(val)}
          </div>
        );
      }
    },
    { 
      header: 'Ticket Prom.', 
      key: 'avgTicket',
      render: (item: any) => {
        const val = item.avgTicket || 0;
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums ${val > 0 ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-slate-50 text-slate-400'}`}>
            {formatCurrency(val)}
          </div>
        );
      }
    },
  ], [processedData, maxTotal]);

  return (
    <div className="space-y-6">
      {/* Filtros Globales Unificados */}
      <div className="animate-in fade-in duration-500">
        <GlobalFilters 
          showSellerFilter={false} 
          showSearch={true}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar usuario..."
          actions={
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Ordenar:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setSortBy('total')}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${
                    sortBy === 'total' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setSortBy('count')}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${
                    sortBy === 'count' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ops
                </button>
                <button
                  onClick={() => setSortBy('avgTicket')}
                  className={`px-2 py-1 text-[9.5px] font-bold rounded-md transition-all cursor-pointer ${
                    sortBy === 'avgTicket' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ticket
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[120px] rounded-2xl" />
          <Skeleton className="h-[120px] rounded-2xl" />
          <Skeleton className="h-[120px] rounded-2xl" />
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Top Seller */}
          <div className="relative overflow-hidden rounded-2xl border shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg p-4 h-[120px] flex flex-col justify-between bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-700/30">
            {/* Watermark */}
            <div className="absolute -bottom-4 -right-4 pointer-events-none select-none text-white/10">
              <Trophy size={72} />
            </div>

            {/* Top row */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
                  <Trophy size={14} className="text-amber-300" />
                </div>
                <span className="text-[10px] font-extrabold text-white/95 uppercase tracking-widest leading-tight truncate">
                  Vendedor Estrella
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 bg-amber-400 text-indigo-900 border border-amber-300">
                LÍDER
              </span>
            </div>

            {/* Center: Vendor Name */}
            <div className="min-w-0">
              <span className="text-xs font-bold text-indigo-100 truncate block">
                {kpis.topSeller?.name || kpis.topSeller?.sellerName}
              </span>
            </div>

            {/* Bottom: total amount */}
            <div>
              <span className="text-xl font-black tabular-nums text-white drop-shadow-sm">
                {formatCurrency(kpis.topSeller?.total)}
              </span>
            </div>
          </div>

          {/* Card 2: Operations Champion */}
          <div className="relative overflow-hidden rounded-2xl border shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg p-4 h-[120px] flex flex-col justify-between bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-700/30">
            {/* Watermark */}
            <div className="absolute -bottom-4 -right-4 pointer-events-none select-none text-white/10">
              <Target size={72} />
            </div>

            {/* Top row */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
                  <Target size={14} className="text-emerald-300" />
                </div>
                <span className="text-[10px] font-extrabold text-white/95 uppercase tracking-widest leading-tight truncate">
                  Mayor Operatividad
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 bg-white/20 text-white">
                PRODUCTIVO
              </span>
            </div>

            {/* Center: Vendor Name */}
            <div className="min-w-0">
              <span className="text-xs font-bold text-emerald-100 truncate block">
                {kpis.maxOpsSeller?.name || kpis.maxOpsSeller?.sellerName}
              </span>
            </div>

            {/* Bottom: total operations */}
            <div>
              <span className="text-xl font-black tabular-nums text-white drop-shadow-sm">
                {kpis.maxOpsSeller?.count} <span className="text-xs font-bold text-emerald-100">operaciones</span>
              </span>
            </div>
          </div>

          {/* Card 3: Global Average Ticket */}
          <div className="relative overflow-hidden rounded-2xl border shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg p-4 h-[120px] flex flex-col justify-between bg-gradient-to-br from-teal-500 to-teal-700 text-white border-teal-700/30">
            {/* Watermark */}
            <div className="absolute -bottom-4 -right-4 pointer-events-none select-none text-white/10">
              <TrendingUp size={72} />
            </div>

            {/* Top row */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
                  <TrendingUp size={14} className="text-teal-300" />
                </div>
                <span className="text-[10px] font-extrabold text-white/95 uppercase tracking-widest leading-tight truncate">
                  Ticket Promedio Global
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 bg-white/20 text-white">
                PROMEDIO
              </span>
            </div>

            {/* Center: Vendor Name */}
            <div className="min-w-0">
              <span className="text-xs font-bold text-teal-100 truncate block">
                Consolidado de Ventas
              </span>
            </div>

            {/* Bottom: average ticket */}
            <div>
              <span className="text-xl font-black tabular-nums text-white drop-shadow-sm">
                {formatCurrency(kpis.avgTicket)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Unificación de Leaderboard y Desglose en una Sola Tabla */}
      <div className="animate-in fade-in duration-700">
        <DataTable 
          title="Ranking y Desglose Analítico de Ventas"
          columns={columns} 
          data={processedData} 
          isLoading={isLoading} 
          showSearch={false}
        />
      </div>
    </div>
  );
};
