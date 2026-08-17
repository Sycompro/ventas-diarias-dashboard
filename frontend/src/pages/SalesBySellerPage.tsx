import React, { useState, useMemo } from 'react';
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

export const SalesBySellerPage: React.FC = () => {
  const { data, isLoading } = useSalesBySeller();
  
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

  const columns = [
    { 
      header: 'Usuario', 
      key: 'name',
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0">
            {(item.name || item.sellerName || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-800 block text-xs">{item.name || item.sellerName}</span>
            <span className="text-[10px] text-slate-400">Usuario registrado</span>
          </div>
        </div>
      )
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
      render: (item: any) => (
        <div className="space-y-1">
          <div className="text-[10.5px] font-medium text-slate-600 flex justify-between gap-4">
            <span className="text-emerald-600 font-semibold">{formatCurrency(item.cpeTotal || 0)}</span>
            <span className="text-amber-600 font-semibold">{formatCurrency(item.notesTotal || 0)}</span>
          </div>
          <div className="w-24 bg-slate-100 rounded-full h-1 overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${item.total > 0 ? ((item.cpeTotal || 0) / item.total) * 100 : 0}%` }} />
            <div className="bg-amber-400 h-full" style={{ width: `${item.total > 0 ? ((item.notesTotal || 0) / item.total) * 100 : 0}%` }} />
          </div>
        </div>
      )
    },
    { 
      header: 'Rubro (Productos vs Servicios)', 
      key: 'productsTotal',
      render: (item: any) => {
        const prodVal = item.productsTotal || 0;
        const servVal = item.servicesTotal || 0;
        const totalRubro = prodVal + servVal || 1;
        return (
          <div className="space-y-1">
            <div className="text-[10.5px] font-medium text-slate-500 flex justify-between gap-4">
              <span className="text-blue-500 font-semibold">{formatCurrency(prodVal)}</span>
              <span className="text-violet-500 font-semibold">{formatCurrency(servVal)}</span>
            </div>
            <div className="w-24 bg-slate-100 rounded-full h-1 overflow-hidden flex">
              <div className="bg-blue-500 h-full" style={{ width: `${(prodVal / totalRubro) * 100}%` }} />
              <div className="bg-violet-500 h-full" style={{ width: `${(servVal / totalRubro) * 100}%` }} />
            </div>
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
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="text-primary" /> Ventas por Usuario
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Análisis del rendimiento y productividad de los vendedores registrados.
        </p>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Top Seller */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl p-4 shadow-md shadow-indigo-500/10 flex items-center justify-between border border-indigo-600/30">
            <div className="space-y-1">
              <span className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider">Vendedor Estrella</span>
              <h3 className="text-sm font-black truncate max-w-[150px]">{kpis.topSeller?.name || kpis.topSeller?.sellerName}</h3>
              <p className="text-lg font-black tabular-nums">{formatCurrency(kpis.topSeller?.total)}</p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <Trophy className="text-amber-300 w-6 h-6 animate-bounce" />
            </div>
          </div>

          {/* Card 2: Operations Champion */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mayor Operatividad</span>
              <h3 className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{kpis.maxOpsSeller?.name || kpis.maxOpsSeller?.sellerName}</h3>
              <p className="text-lg font-black text-slate-800 tabular-nums">{kpis.maxOpsSeller?.count} <span className="text-xs text-slate-400 font-normal">operaciones</span></p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-primary border border-slate-100">
              <Target className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Global Average Ticket */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ticket Promedio Global</span>
              <h3 className="text-sm font-bold text-slate-800">Consolidado Usuarios</h3>
              <p className="text-lg font-black text-slate-800 tabular-nums">{formatCurrency(kpis.avgTicket)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-emerald-600 border border-slate-100">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Leaderboard & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leaderboard Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Trophy className="text-amber-500 w-4 h-4 shrink-0" /> Leaderboard de Ventas
            </h3>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-full border border-indigo-100">
              Podio
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : processedData.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No hay usuarios para mostrar.
              </div>
            ) : (
              processedData.slice(0, 5).map((sellerItem: any, index: number) => {
                const badgeColor = index === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                 : index === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' 
                                 : index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200'
                                 : 'bg-slate-50 text-slate-500 border-slate-100';

                return (
                  <div key={sellerItem.name || sellerItem.sellerName} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Badge / Medal */}
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${badgeColor}`}>
                        #{index + 1}
                      </div>
                      
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 block truncate">{sellerItem.name || sellerItem.sellerName}</span>
                        <span className="text-[9.5px] text-slate-400 block">{sellerItem.count} operaciones registradas</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-xs text-slate-800 block tabular-nums">{formatCurrency(sellerItem.total)}</span>
                      <span className="text-[9px] text-slate-400 block tabular-nums">Prom: {formatCurrency(sellerItem.avgTicket)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed List Card */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 py-1.5 text-xs placeholder:text-slate-400"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Ordenar:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setSortBy('total')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    sortBy === 'total' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setSortBy('count')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    sortBy === 'count' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ops
                </button>
                <button
                  onClick={() => setSortBy('avgTicket')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    sortBy === 'avgTicket' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ticket Prom.
                </button>
              </div>
            </div>

          </div>

          {/* Table */}
          <DataTable 
            title="Matriz de Desglose Analítico"
            columns={columns} 
            data={processedData} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
};
