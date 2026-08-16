import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  User, 
  Building2, 
  DollarSign, 
  CreditCard, 
  ArrowLeftRight, 
  Smartphone, 
  HelpCircle,
  Package,
  Briefcase,
  XCircle
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { GlobalFilters } from '../components/filters/GlobalFilters';
import { useSalesPivot, useSalesByDocumentType, useDashboardMetrics } from '../hooks/useSalesMetrics';
import { formatCurrency } from '../utils/formatters';
import { useAuthStore } from '../hooks/useAuth';
import axios from 'axios';
import { useHeaderStore } from '../hooks/useHeader';

export const SalesPage: React.FC = () => {
  const { companyId, dateStart, dateEnd } = useFilters();
  const token = useAuthStore((state) => state.accessToken);
  
  const { data: pivotResponse, isLoading: loadingPivot } = useSalesPivot();
  const { data: docTypeMetrics, isLoading: loadingDocTypes } = useSalesByDocumentType();
  const { data: metrics } = useDashboardMetrics();
  
  const pivotData = pivotResponse?.pivotData || [];
  const paymentMethods = pivotResponse?.paymentMethods || [];

  const [expandedSedes, setExpandedSedes] = useState<Record<string, boolean>>({});

  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  const toggleSede = (sede: string) => {
    setExpandedSedes(prev => ({ ...prev, [sede]: !prev[sede] }));
  };

  const handleExport = () => {
    if (!companyId) return;
    axios({
      url: `/api/reports/excel`,
      method: 'GET',
      params: { companyId, dateStart, dateEnd },
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` }
    }).then((response) => {
      const href = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = href;
      link.setAttribute('download', `reporte_ventas_${dateStart}_a_${dateEnd}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    }).catch(err => console.error("Error exporting report:", err));
  };

  useEffect(() => {
    setHeader(
      'Detalle de Ventas',
      'Cuadro estadístico de ingresos consolidado por sedes, vendedores y métodos de pago.',
      <button 
         onClick={handleExport}
         className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        <Download size={12} />
        Exportar Excel
      </button>
    );
    return () => clearHeader();
  }, [companyId, dateStart, dateEnd, token]);

  // Calcular totales generales dinámicamente
  const grandTotals = useMemo(() => {
    const totals: Record<string, number> = { total: 0 };
    paymentMethods.forEach((m: any) => {
      totals[m.id] = 0;
    });

    pivotData.forEach((s: any) => {
      paymentMethods.forEach((m: any) => {
        totals[m.id] += parseFloat(s.payments?.[m.id] || 0);
      });
      totals.total += parseFloat(s.total || 0);
    });
    return totals;
  }, [pivotData, paymentMethods]);

  const docSummaryData = useMemo(() => {
    if (!docTypeMetrics) return [];
    const base = [
      { name: 'Facturas', amount: docTypeMetrics.facturas.amount, count: docTypeMetrics.facturas.count, colorCard: 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-700/30 shadow-blue-500/30', pillColor: 'bg-white/25 text-white', type: 'doc', icon: <DollarSign size={16} className="text-white shrink-0" />, watermark: <DollarSign size={64} className="text-white/10" /> },
      { name: 'Boletas', amount: docTypeMetrics.boletas.amount, count: docTypeMetrics.boletas.count, colorCard: 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-700/30 shadow-emerald-500/30', pillColor: 'bg-white/25 text-white', type: 'doc', icon: <CreditCard size={16} className="text-white shrink-0" />, watermark: <CreditCard size={64} className="text-white/10" /> },
      { name: 'Notas de Venta', amount: docTypeMetrics.notasVenta.amount, count: docTypeMetrics.notasVenta.count, colorCard: 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-600/30 shadow-amber-500/30', pillColor: 'bg-white/25 text-white', type: 'doc', icon: <ArrowLeftRight size={16} className="text-white shrink-0" />, watermark: <ArrowLeftRight size={64} className="text-white/10" /> },
      { name: 'Notas de Crédito', amount: docTypeMetrics.notasCredito.amount, count: docTypeMetrics.notasCredito.count, colorCard: 'bg-gradient-to-br from-rose-500 to-rose-700 border-rose-700/30 shadow-rose-500/30', pillColor: 'bg-white/25 text-white', type: 'doc', icon: <Smartphone size={16} className="text-white shrink-0" />, watermark: <Smartphone size={64} className="text-white/10" /> },
      { name: 'Anulados', amount: docTypeMetrics.anulados?.amount || 0, count: docTypeMetrics.anulados?.count || 0, colorCard: 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-800/30 shadow-slate-600/30', pillColor: 'bg-white/25 text-white', type: 'doc', icon: <XCircle size={16} className="text-white shrink-0" />, watermark: <XCircle size={64} className="text-white/10" /> },
    ];
    if (metrics?.byItemType) {
      const totalItem = (metrics.byItemType.products || 0) + (metrics.byItemType.services || 0) || 1;
      base.push(
        { 
          name: 'Productos', 
          amount: metrics.byItemType.products, 
          count: Math.round((metrics.byItemType.products / totalItem) * 100), 
          colorCard: 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-700/30 shadow-indigo-500/30',
          pillColor: 'bg-white/25 text-white',
          type: 'category', 
          icon: <Package size={16} className="text-white shrink-0" />,
          watermark: <Package size={64} className="text-white/10" />
        },
        { 
          name: 'Servicios', 
          amount: metrics.byItemType.services, 
          count: Math.round((metrics.byItemType.services / totalItem) * 100), 
          colorCard: 'bg-gradient-to-br from-teal-500 to-teal-700 border-teal-700/30 shadow-teal-500/30',
          pillColor: 'bg-white/25 text-white',
          type: 'category', 
          icon: <Briefcase size={16} className="text-white shrink-0" />,
          watermark: <Briefcase size={64} className="text-white/10" />
        }
      );
    }
    return base;
  }, [docTypeMetrics, metrics]);

  return (
    <div className="space-y-6">

      {/* Filtros Globales */}
      <div className="animate-in fade-in duration-500">
        <GlobalFilters />
      </div>

      {/* Resumen General Unificado */}
      <div className="animate-in fade-in duration-700 delay-100">
        {loadingDocTypes || loadingPivot ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-[120px] rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : docSummaryData.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-sm">
            No se encontraron datos registrados en el rango seleccionado.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {docSummaryData.map((doc) => (
              <div
                key={doc.name}
                className={`relative overflow-hidden rounded-2xl border shadow-md transition-all duration-300 hover:scale-[1.03] hover:shadow-lg p-4 h-[120px] flex flex-col justify-between ${doc.colorCard}`}
              >
                {/* Watermark icon bottom-right */}
                <div className="absolute -bottom-3 -right-3 pointer-events-none select-none">
                  {doc.watermark}
                </div>

                {/* Top row: icon + name + badge */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
                      {doc.icon}
                    </div>
                    <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-widest leading-tight truncate">
                      {doc.name}
                    </span>
                  </div>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${doc.pillColor || 'bg-white/25 text-white'}`}>
                    {doc.count}{doc.type === 'category' ? '%' : ' emit.'}
                  </span>
                </div>

                {/* Bottom: amount */}
                <div>
                  <span className="text-lg font-black tabular-nums text-white drop-shadow-sm">
                    {formatCurrency(doc.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cuadro Estadístico Pivot - Solicitud de Usuario */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden animate-in fade-in duration-700 delay-200">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Resumen de Ventas por Método de Pago</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Despliega cada sede para ver el desglose detallado de sus vendedores.</p>
          </div>
          <span className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">
            Consolidado
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold text-slate-700 min-w-[220px]">Sede / Vendedor</th>
                {paymentMethods.map((m: any) => {
                  const descUpper = m.description.toUpperCase();
                  let icon = <HelpCircle size={11} className="text-slate-500" />;
                  if (descUpper.includes('EFECTIVO') || descUpper.includes('CONTADO')) {
                    icon = <DollarSign size={11} className="text-emerald-500" />;
                  } else if (descUpper === 'CRÉDITO' || descUpper === 'CREDITO') {
                    icon = <ArrowLeftRight size={11} className="text-amber-500" />;
                  } else if (descUpper.includes('TARJETA') || descUpper.includes('VISA') || descUpper.includes('MASTERCARD') || descUpper.includes('CREDITO') || descUpper.includes('DEBITO')) {
                    icon = <CreditCard size={11} className="text-blue-500" />;
                  } else if (descUpper.includes('TRANSFERENCIA') || descUpper.includes('BANCO') || descUpper.includes('BCP') || descUpper.includes('BBVA')) {
                    icon = <ArrowLeftRight size={11} className="text-indigo-500" />;
                  } else if (descUpper.includes('YAPE') || descUpper.includes('PLIN')) {
                    icon = <Smartphone size={11} className="text-violet-500" />;
                  }
                  return (
                    <th key={m.id} className="py-3.5 px-3 text-right font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1">{icon} {m.description}</span>
                    </th>
                  );
                })}
                <th className="py-3.5 px-4 text-right font-semibold text-slate-900 bg-slate-50/80">Total General</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loadingPivot ? (
                <tr>
                  <td colSpan={(paymentMethods.length || 5) + 2} className="py-8 text-center text-slate-400">
                    <span className="inline-block animate-pulse">Cargando estadísticas...</span>
                  </td>
                </tr>
              ) : !pivotData || pivotData.length === 0 ? (
                <tr>
                  <td colSpan={(paymentMethods.length || 5) + 2} className="py-8 text-center text-slate-400">
                    No se encontraron transacciones en el rango de fechas seleccionado.
                  </td>
                </tr>
              ) : (
                <>
                  {pivotData.map((sede: any) => {
                    const isExpanded = !!expandedSedes[sede.sede];
                    return (
                      <React.Fragment key={sede.sede}>
                        {/* Fila Padre: Sede */}
                        <tr className="bg-slate-50/40 hover:bg-slate-50 transition-colors font-semibold text-slate-800">
                          <td className="py-3 px-4 flex items-center gap-2">
                            <button
                              onClick={() => toggleSede(sede.sede)}
                              className="p-1 rounded hover:bg-slate-200/80 transition-colors text-slate-500"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 size={14} className="text-slate-400 shrink-0" />
                              {sede.sede}
                            </span>
                          </td>
                          {paymentMethods.map((m: any) => (
                            <td key={m.id} className="py-3 px-3 text-right tabular-nums">
                              {formatCurrency(sede.payments?.[m.id] || 0)}
                            </td>
                          ))}
                          <td className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-50/55 tabular-nums">{formatCurrency(sede.total)}</td>
                        </tr>

                        {/* Filas Hijos: Vendedores (solo si está expandido) */}
                        {isExpanded && sede.vendedores.map((vendedor: any) => (
                          <tr key={vendedor.vendedor} className="hover:bg-slate-50/60 transition-colors text-slate-600">
                            <td className="py-2.5 pl-11 pr-4 flex items-center gap-2">
                              <User size={13} className="text-slate-400 shrink-0" />
                              <span>{vendedor.vendedor}</span>
                            </td>
                            {paymentMethods.map((m: any) => (
                              <td key={m.id} className="py-2.5 px-3 text-right text-xs tabular-nums text-slate-500">
                                {formatCurrency(vendedor.payments?.[m.id] || 0)}
                              </td>
                            ))}
                            <td className="py-2.5 px-4 text-right font-medium text-slate-800 bg-slate-50/10 tabular-nums">{formatCurrency(vendedor.total)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Fila de Totales Generales */}
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td className="py-3.5 px-4">TOTAL GENERAL</td>
                    {paymentMethods.map((m: any) => (
                      <td key={m.id} className="py-3.5 px-3 text-right tabular-nums">
                        {formatCurrency(grandTotals[m.id] || 0)}
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right font-extrabold text-primary-900 bg-slate-100 tabular-nums">{formatCurrency(grandTotals.total)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
