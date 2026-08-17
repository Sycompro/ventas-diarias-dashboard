import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Target, 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  Building2,
  TrendingUp,
  HelpCircle,
  CreditCard,
  DollarSign,
  Smartphone,
  ArrowLeftRight
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

  const columns = useMemo(() => [
    { 
      header: 'Ranking / Usuario', 
      key: 'name',
      render: (item: any) => {
        const rank = processedData.findIndex((s: any) => (s.name || s.sellerName) === (item.name || item.sellerName)) + 1;
        
        const badgeColor = rank === 1 ? 'bg-amber-100 text-amber-700 border-amber-200 font-black' 
                         : rank === 2 ? 'bg-slate-100 text-slate-700 border-slate-200 font-bold' 
                         : rank === 3 ? 'bg-orange-100 text-orange-700 border-orange-200 font-semibold'
                         : 'bg-slate-50 text-slate-500 border-slate-100';

        return (
          <div className="flex items-center gap-2.5">
            {/* Rank Badge */}
            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-bold ${badgeColor}`}>
              #{rank}
            </div>
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0">
              {(item.name || item.sellerName || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-slate-800 block text-xs">{item.name || item.sellerName}</span>
              <span className="text-[10px] text-slate-400">Usuario registrado</span>
            </div>
          </div>
        );
      }
    },
    { 
      header: 'Operaciones', 
      key: 'count',
      render: (item: any) => (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-slate-700 tabular-nums">
            {item.count} ops
          </div>
          <div className="text-[9.5px] text-slate-400 flex items-center gap-1.5">
            <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 rounded font-medium">CPE: {item.cpeCount || 0}</span>
            <span className="px-1 py-0.2 bg-amber-50 text-amber-700 rounded font-medium">NV: {item.notesCount || 0}</span>
          </div>
        </div>
      )
    },
    { 
      header: 'Desglose Ventas', 
      key: 'cpeTotal',
      render: (item: any) => {
        const cpe = item.cpeTotal || 0;
        const nv = item.notesTotal || 0;
        const total = cpe + nv || 1;
        const cpePct = Math.round((cpe / total) * 100);
        const nvPct = 100 - cpePct;
        return (
          <div className="min-w-[160px]">
            {/* Stacked rows with label + value */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">CPE</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 tabular-nums">{formatCurrency(cpe)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">NV</span>
              </div>
              <span className="text-[11px] font-bold text-amber-600 tabular-nums">{formatCurrency(nv)}</span>
            </div>
            {/* Proportional bar */}
            <div className="w-full bg-slate-100 rounded-full h-[5px] overflow-hidden flex">
              <div className="bg-emerald-500 h-full rounded-l-full transition-all" style={{ width: `${cpePct}%` }} />
              <div className="bg-amber-400 h-full rounded-r-full transition-all" style={{ width: `${nvPct}%` }} />
            </div>
            {(cpe > 0 || nv > 0) && (
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px] text-slate-400 tabular-nums">{cpePct}%</span>
                <span className="text-[8px] text-slate-400 tabular-nums">{nvPct}%</span>
              </div>
            )}
          </div>
        );
      }
    },
    { 
      header: 'Rubro (Prod. vs Serv.)', 
      key: 'productsTotal',
      render: (item: any) => {
        const prodVal = item.productsTotal || 0;
        const servVal = item.servicesTotal || 0;
        const totalRubro = prodVal + servVal || 1;
        const prodPct = Math.round((prodVal / totalRubro) * 100);
        const servPct = 100 - prodPct;
        return (
          <div className="min-w-[160px]">
            {/* Stacked rows with label + value */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-blue-500 shrink-0" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Productos</span>
              </div>
              <span className="text-[11px] font-bold text-blue-600 tabular-nums">{formatCurrency(prodVal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-violet-500 shrink-0" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Servicios</span>
              </div>
              <span className="text-[11px] font-bold text-violet-600 tabular-nums">{formatCurrency(servVal)}</span>
            </div>
            {/* Proportional bar */}
            <div className="w-full bg-slate-100 rounded-full h-[5px] overflow-hidden flex">
              <div className="bg-blue-500 h-full rounded-l-full transition-all" style={{ width: `${prodPct}%` }} />
              <div className="bg-violet-500 h-full rounded-r-full transition-all" style={{ width: `${servPct}%` }} />
            </div>
            {(prodVal > 0 || servVal > 0) && (
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px] text-slate-400 tabular-nums">{prodPct}%</span>
                <span className="text-[8px] text-slate-400 tabular-nums">{servPct}%</span>
              </div>
            )}
          </div>
        );
      }
    },
    { 
      header: 'Ticket Promedio', 
      key: 'avgTicket',
      render: (item: any) => <span className="tabular-nums font-semibold text-slate-600 text-xs">{formatCurrency(item.avgTicket)}</span>
    },
    { 
      header: 'Total Vendido', 
      key: 'total',
      render: (item: any) => <span className="font-extrabold text-indigo-600 tabular-nums text-xs">{formatCurrency(item.total)}</span>
    },
  ], [processedData]);

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
