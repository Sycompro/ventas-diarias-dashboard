import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  DollarSign, 
  Clock, 
  Tag, 
  Award, 
  AlertTriangle, 
  Search 
} from 'lucide-react';
import { productsService } from '../services/api';
import { useFilters } from '../hooks/useFilters';
import { useHeaderStore } from '../hooks/useHeader';
import { formatCurrency } from '../utils/formatters';
import { Skeleton } from '../components/ui/Skeleton';
import { CustomSelect } from '../components/ui/CustomSelect';

interface ProductItem {
  name: string;
  totalQty: number;
  totalRevenue: number;
  transactionCount: number;
  avgPrice: number;
  dailyRotation: number;
  abcClass: 'A' | 'B' | 'C';
  daysSinceLastSale: number;
}

interface ProductAnalytics {
  topRotation: ProductItem[];
  lowRotation: ProductItem[];
  priceOpportunities: ProductItem[];
  discountCandidates: ProductItem[];
  staleProducts: ProductItem[];
  summary: {
    totalUniqueProducts: number;
    totalUnitsSold: number;
    avgRotationPerDay: number;
    classACount: number;
    classBCount: number;
    classCCount: number;
  };
}

export const ProductsPage: React.FC = () => {
  const { companyId, dateStart, dateEnd, branch, seller } = useFilters();
  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  const [searchQuery, setSearchQuery] = useState('');
  const [abcFilter, setAbcFilter] = useState<string | null>(null);

  useEffect(() => {
    setHeader(
      'Análisis de Productos',
      'Rotación, clasificación ABC y oportunidades de precio.'
    );
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const { data, isLoading } = useQuery<ProductAnalytics>({
    queryKey: ['products-analytics', companyId, dateStart, dateEnd, branch, seller],
    queryFn: () => productsService.getAnalytics({ 
      companyId: companyId as string, 
      dateStart, 
      dateEnd, 
      branch: branch || undefined, 
      seller: seller || undefined 
    }),
    enabled: !!companyId && !!dateStart && !!dateEnd
  });

  const filterProducts = (items: ProductItem[] | undefined) => {
    if (!items) return [];
    return items.filter((item) => {
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (abcFilter && item.abcClass !== abcFilter) return false;
      return true;
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
        </div>
        {/* ABC Filter */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Clasificación</span>
          <CustomSelect
            value={abcFilter}
            onChange={setAbcFilter}
            options={[
              {value:'A',label:'Clase A (Top 20%)'},
              {value:'B',label:'Clase B (Medio)'},
              {value:'C',label:'Clase C (Bajo)'}
            ]}
            placeholder="Todas las clases"
          />
        </div>
      </div>

      {isLoading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton variant="card" className="h-20" />
            <Skeleton variant="card" className="h-20" />
            <Skeleton variant="card" className="h-20" />
            <Skeleton variant="card" className="h-20" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Skeleton variant="card" className="h-80" />
            <Skeleton variant="card" className="h-80" />
          </div>
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
          <Skeleton variant="card" className="h-64" />
        </>
      ) : data ? (
        <>
          {/* Section 2: KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Package size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Productos Únicos</span>
                <span className="text-lg font-black text-slate-800 block mt-0.5 truncate">{data.summary.totalUniqueProducts}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unidades Vendidas</span>
                <span className="text-lg font-black text-slate-800 block mt-0.5 truncate">{data.summary.totalUnitsSold.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <BarChart3 size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rotación Prom/Día</span>
                <span className="text-lg font-black text-slate-800 block mt-0.5 truncate">{data.summary.avgRotationPerDay.toFixed(1)} uds</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Tag size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distribución ABC</span>
                <span className="text-lg font-black text-slate-800 block mt-0.5 truncate">
                  A:{data.summary.classACount} B:{data.summary.classBCount} C:{data.summary.classCCount}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Dual Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Alta Rotación */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-emerald-50/40 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800">🏆 Alta Rotación — Top 15</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {filterProducts(data.topRotation).map((item, index) => (
                  <div key={index} className="px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors">
                    <span className="text-[10px] font-black text-slate-300 w-5 text-right tabular-nums">{index+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700 truncate capitalize">{item.name}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {item.transactionCount} transacciones · Precio prom: {formatCurrency(item.avgPrice)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 tabular-nums">{item.totalQty.toLocaleString()} uds</span>
                      <span className="text-[9px] text-slate-400 block">{formatCurrency(item.totalRevenue)}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${item.abcClass === 'A' ? 'bg-emerald-50 text-emerald-700' : item.abcClass === 'B' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.abcClass}
                    </span>
                  </div>
                ))}
                {filterProducts(data.topRotation).length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">No se encontraron productos.</div>
                )}
              </div>
            </div>

            {/* Baja Rotación */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-rose-50/40 flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-600" />
                <h3 className="text-xs font-bold text-slate-800">⚠️ Baja Rotación — Bottom 15</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {filterProducts(data.lowRotation).map((item, index) => (
                  <div key={index} className="px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors">
                    <span className="text-[10px] font-black text-slate-300 w-5 text-right tabular-nums">{index+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700 truncate capitalize">{item.name}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {item.transactionCount} transacciones · Precio prom: {formatCurrency(item.avgPrice)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 tabular-nums">{item.totalQty.toLocaleString()} uds</span>
                      <span className="text-[9px] text-slate-400 block">{formatCurrency(item.totalRevenue)}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${item.abcClass === 'A' ? 'bg-emerald-50 text-emerald-700' : item.abcClass === 'B' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.abcClass}
                    </span>
                  </div>
                ))}
                {filterProducts(data.lowRotation).length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">No se encontraron productos.</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Price Opportunities table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-blue-50/30 flex items-center gap-2 flex-wrap">
              <DollarSign size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800">💰 Oportunidades de Precio — Productos Aptos para Mejora</h3>
              <span className="text-[9px] text-slate-400 ml-auto">Alta demanda constante, candidatos a incremento de precio</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/60">
                    <th className="text-left px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Uds. Vendidas</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rotación/Día</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Precio Prom.</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                    <th className="text-center px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Clase</th>
                    <th className="text-center px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sugerencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filterProducts(data.priceOpportunities).map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-2.5 text-[11px] font-semibold text-slate-700 capitalize">{item.name}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-slate-800 text-right tabular-nums">{item.totalQty.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 text-right tabular-nums">{item.dailyRotation.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 text-right tabular-nums">{formatCurrency(item.avgPrice)}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-slate-800 text-right tabular-nums">{formatCurrency(item.totalRevenue)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{item.abcClass}</span>
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">↑ Subir Precio</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filterProducts(data.priceOpportunities).length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">No se encontraron oportunidades de mejora de precio en este período.</div>
            )}
          </div>

          {/* Section 5: Discount Candidates table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-amber-50/30 flex items-center gap-2 flex-wrap">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="text-xs font-bold text-slate-800">🏷️ Candidatos a Descuento — Baja Rotación</h3>
              <span className="text-[9px] text-slate-400 ml-auto">Productos con poca demanda, candidatos a aplicar descuento o promoción</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/60">
                    <th className="text-left px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Uds. Vendidas</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Días Sin Venta</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rotación/Día</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Precio Prom.</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                    <th className="text-center px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Clase</th>
                    <th className="text-center px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sugerencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filterProducts(data.discountCandidates).map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-2.5 text-[11px] font-semibold text-slate-700 capitalize">{item.name}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-slate-800 text-right tabular-nums">{item.totalQty.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 text-right tabular-nums">{item.daysSinceLastSale}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 text-right tabular-nums">{item.dailyRotation.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 text-right tabular-nums">{formatCurrency(item.avgPrice)}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-slate-800 text-right tabular-nums">{formatCurrency(item.totalRevenue)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.abcClass}</span>
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">↓ Aplicar Descuento</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filterProducts(data.discountCandidates).length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">No se encontraron candidatos a descuento en este período.</div>
            )}
          </div>

          {/* Section 6: Stale Products table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-rose-50/30 flex items-center gap-2 flex-wrap">
              <Clock size={16} className="text-rose-600" />
              <h3 className="text-xs font-bold text-slate-800">🕰️ Productos Estancados — Mayor Antigüedad Sin Venta</h3>
              <span className="text-[9px] text-slate-400 ml-auto">Productos que llevan más tiempo sin venderse</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/60">
                    <th className="text-left px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Última Venta</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Uds. Totales</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Precio Prom.</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ingresos</th>
                    <th className="text-center px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Clase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filterProducts(data.staleProducts).map((item, i) => (
                    <tr key={i} className={`hover:bg-slate-50/60 transition-colors ${item.daysSinceLastSale > 30 ? 'bg-rose-50/20' : ''}`}>
                      <td className="px-5 py-2.5 text-[11px] font-semibold text-slate-700 capitalize">{item.name}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-slate-800 text-right tabular-nums">{item.daysSinceLastSale} días</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 text-right tabular-nums">{item.totalQty.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-600 text-right tabular-nums">{formatCurrency(item.avgPrice)}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-slate-800 text-right tabular-nums">{formatCurrency(item.totalRevenue)}</td>
                      <td className="px-5 py-2.5 text-center">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.abcClass}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filterProducts(data.staleProducts).length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">No se encontraron productos estancados en este período.</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
