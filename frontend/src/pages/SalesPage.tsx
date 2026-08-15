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
  Briefcase
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
    return [
      { name: 'Facturas', amount: docTypeMetrics.facturas.amount, count: docTypeMetrics.facturas.count, colorBg: 'bg-blue-50 text-blue-700 border-blue-100/50' },
      { name: 'Boletas', amount: docTypeMetrics.boletas.amount, count: docTypeMetrics.boletas.count, colorBg: 'bg-emerald-50 text-emerald-700 border-emerald-100/50' },
      { name: 'Notas de Venta', amount: docTypeMetrics.notasVenta.amount, count: docTypeMetrics.notasVenta.count, colorBg: 'bg-amber-50 text-amber-700 border-amber-100/50' },
      { name: 'Notas de Crédito', amount: docTypeMetrics.notasCredito.amount, count: docTypeMetrics.notasCredito.count, colorBg: 'bg-rose-50 text-rose-700 border-rose-100/50' },
    ];
  }, [docTypeMetrics]);

  return (
    <div className="space-y-6">

      {/* Filtros Globales */}
      <div className="animate-in fade-in duration-500">
        <GlobalFilters />
      </div>

      {/* Resumen por Tipo de Comprobante - Solicitud de Usuario */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden animate-in fade-in duration-700 delay-100">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">Resumen por Tipo de Comprobante</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Ingresos acumulados y cantidad de documentos emitidos.</p>
        </div>

        <div className="p-5">
          {loadingDocTypes ? (
            <div className="py-6 text-center text-slate-400 animate-pulse">
              Cargando resumen de comprobantes...
            </div>
          ) : docSummaryData.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              No se encontraron comprobantes registrados en el rango seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {docSummaryData.map((doc) => {
                const isNegative = doc.amount < 0;
                return (
                  <div key={doc.name} className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/40 hover:bg-slate-50 transition-all duration-300 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">{doc.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${doc.colorBg}`}>
                        {doc.count} emitidos
                      </span>
                    </div>
                    <div className="mt-4">
                      <span className={`text-xl font-extrabold tabular-nums ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatCurrency(doc.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ventas por Categoría: Productos vs Servicios - Solicitud de Usuario */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden animate-in fade-in duration-700 delay-150">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <ShoppingCart size={15} className="text-slate-500" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Ventas por Categoría</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Ingresos según el tipo de ítem vendido.</p>
          </div>
        </div>

        <div className="p-5 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          {loadingPivot ? (
            <div className="col-span-3 py-8 text-center text-slate-400 animate-pulse">
              Cargando categorías...
            </div>
          ) : (
            <>
              {/* Tarjeta 1: Total Consolidado */}
              <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-100 flex flex-col justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facturado Consolidado</span>
                <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                  {formatCurrency((metrics?.byItemType?.products || 0) + (metrics?.byItemType?.services || 0))}
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase mt-2 bg-slate-100 py-1 px-2.5 rounded-full self-center">
                  {(metrics?.byItemType?.products || 0) > (metrics?.byItemType?.services || 0) ? (
                    "Predominan Productos"
                  ) : (metrics?.byItemType?.services || 0) > (metrics?.byItemType?.products || 0) ? (
                    "Predominan Servicios"
                  ) : (
                    "Distribución Equitativa"
                  )}
                </span>
              </div>

              {/* Tarjeta 2: Productos */}
              <div className="bg-slate-50/20 hover:bg-slate-50/50 transition-all border border-slate-200/50 p-5 rounded-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-blue-500" />
                    <span className="font-bold text-slate-700 text-xs">Productos</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 tabular-nums">
                    {(((metrics?.byItemType?.products || 0) / (((metrics?.byItemType?.products || 0) + (metrics?.byItemType?.services || 0)) || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                    {formatCurrency(metrics?.byItemType?.products || 0)}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((metrics?.byItemType?.products || 0) / (((metrics?.byItemType?.products || 0) + (metrics?.byItemType?.services || 0)) || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Servicios */}
              <div className="bg-slate-50/20 hover:bg-slate-50/50 transition-all border border-slate-200/50 p-5 rounded-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-emerald-500" />
                    <span className="font-bold text-slate-700 text-xs">Servicios</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 tabular-nums">
                    {(((metrics?.byItemType?.services || 0) / (((metrics?.byItemType?.products || 0) + (metrics?.byItemType?.services || 0)) || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                    {formatCurrency(metrics?.byItemType?.services || 0)}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((metrics?.byItemType?.services || 0) / (((metrics?.byItemType?.products || 0) + (metrics?.byItemType?.services || 0)) || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
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
