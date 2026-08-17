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
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { GlobalFilters } from '../components/filters/GlobalFilters';
import { useSalesPivot, useSalesByDocumentType, useDashboardMetrics, useSalesByHour } from '../hooks/useSalesMetrics';
import { HourlySalesAnalysis } from '../components/charts/HourlySalesAnalysis';
import { TaxIgvCard } from '../components/charts/TaxIgvCard';
import { formatCurrency } from '../utils/formatters';
import { useAuthStore } from '../hooks/useAuth';
import axios from 'axios';
import { useHeaderStore } from '../hooks/useHeader';
import { useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/api';

export const SalesPage: React.FC = () => {
  const { companyId, dateStart, dateEnd } = useFilters();
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  
  const { data: pivotResponse, isLoading: loadingPivot } = useSalesPivot();
  const { data: docTypeMetrics, isLoading: loadingDocTypes } = useSalesByDocumentType();
  const { data: metrics } = useDashboardMetrics();
  const { data: hourlySales, isLoading: loadingHourly } = useSalesByHour();
  
  const pivotData = pivotResponse?.pivotData || [];
  const paymentMethods = pivotResponse?.paymentMethods || [];

  const [expandedMethods, setExpandedMethods] = useState<Record<string, boolean>>({});

  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  const toggleMethod = (methodId: string) => {
    setExpandedMethods(prev => ({ ...prev, [methodId]: !prev[methodId] }));
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
      'Cuadro estadístico de ingresos consolidado por sucursales, usuarios y métodos de pago.'
    );
    return () => clearHeader();
  }, [companyId, dateStart, dateEnd, token]);

  // Calcular totales generales dinámicamente para el Flujo de Caja
  const grandTotals = useMemo(() => {
    let cpe = 0;
    let notes = 0;
    let purchases = 0;
    
    pivotData.forEach((s: any) => {
      cpe += parseFloat(s.totalCpe || 0);
      notes += parseFloat(s.totalNotes || 0);
      purchases += parseFloat(s.totalPurchases || 0);
    });

    return {
      cpe,
      notes,
      purchases,
      saldo: cpe + notes - purchases
    };
  }, [pivotData]);

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

      {/* Filtros Globales + Exportar */}
      <div className="animate-in fade-in duration-500 space-y-3">
        <GlobalFilters
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md shrink-0 cursor-pointer"
              >
                <Download size={13} />
                Exportar Excel
              </button>
            </div>
          }
        />
        <TaxIgvCard 
          taxes={metrics?.taxes} 
          nonDeclaredAmount={metrics?.byDocumentType?.notasVenta?.amount} 
          isLoading={loadingDocTypes} 
        />
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

      {/* Cuadro Estadístico Pivot (Directamente debajo de las tarjetas) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm animate-in fade-in duration-700 delay-200">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <CreditCard size={13} className="text-indigo-600" />
            </div>
            <span className="font-bold text-slate-800 text-sm tracking-tight">Ingresos y Egresos por Método de Pago</span>
          </div>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Flujo de Caja
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table head */}
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60">
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest min-w-[220px]">
                  Descripción / Método de Pago
                </th>
                <th className="py-2.5 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  CPE (Boletas/Facturas)
                </th>
                <th className="py-2.5 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Notas de Venta
                </th>
                <th className="py-2.5 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Ingresos (Finanzas)
                </th>
                <th className="py-2.5 px-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Compras (Egresos)
                </th>
                <th className="py-2.5 px-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Saldo Neto
                </th>
              </tr>
            </thead>

            {/* Table body */}
            <tbody className="divide-y divide-slate-100">
              {loadingPivot ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    <span className="inline-block animate-pulse">Cargando estadísticas de caja...</span>
                  </td>
                </tr>
              ) : !pivotData || pivotData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    No se encontraron transacciones en el rango de fechas seleccionado.
                  </td>
                </tr>
              ) : (
                <>
                  {paymentMethods.map((m: any) => {
                    const isExpanded = !!expandedMethods[m.id];
                    
                    // Calcular totales de este método de pago cruzando todas las sucursales
                    let mCpe = 0;
                    let mNotes = 0;
                    let mPurchases = 0;

                    pivotData.forEach((s: any) => {
                      mCpe += parseFloat(s.cpePayments?.[m.id] || 0);
                      mNotes += parseFloat(s.notePayments?.[m.id] || 0);
                      mPurchases += parseFloat(s.purchasePayments?.[m.id] || 0);
                    });

                    const mSaldo = mCpe + mNotes - mPurchases;

                    const descUpper = m.description.toUpperCase();
                    let icon = <HelpCircle size={11} className="text-slate-400" />;
                    if (descUpper.includes('EFECTIVO')) icon = <DollarSign size={11} className="text-emerald-600" />;
                    else if (descUpper === 'CRÉDITO' || descUpper === 'CREDITO') icon = <ArrowLeftRight size={11} className="text-amber-600" />;
                    else if (descUpper.includes('CONTADO')) icon = <DollarSign size={11} className="text-emerald-600" />;
                    else if (descUpper.includes('TARJETA') || descUpper.includes('VISA') || descUpper.includes('DEBITO')) icon = <CreditCard size={11} className="text-blue-600" />;
                    else if (descUpper.includes('TRANSFERENCIA')) icon = <ArrowLeftRight size={11} className="text-indigo-600" />;
                    else if (descUpper.includes('YAPE') || descUpper.includes('PLIN')) icon = <Smartphone size={11} className="text-violet-600" />;

                    return (
                      <React.Fragment key={m.id}>
                        {/* Fila principal del Método de Pago */}
                        <tr className="bg-slate-50/75 hover:bg-slate-100/50 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleMethod(m.id)}
                                className="p-0.5 rounded-md hover:bg-slate-200 transition-colors text-slate-500 shrink-0 cursor-pointer"
                              >
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                              <div className="flex items-center gap-1.5">
                                <div className="p-1 bg-slate-100 rounded-md shrink-0">
                                  {icon}
                                </div>
                                <span className="text-xs font-bold text-slate-800">{m.description}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-700 tabular-nums">
                            {formatCurrency(mCpe)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-700 tabular-nums">
                            {formatCurrency(mNotes)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-400/80 tabular-nums">
                            S/. 0.00
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-rose-600 tabular-nums">
                            {mPurchases > 0 ? `-${formatCurrency(mPurchases)}` : 'S/. 0.00'}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs font-extrabold text-indigo-700 tabular-nums">
                            {formatCurrency(mSaldo)}
                          </td>
                        </tr>

                        {/* Desglose por Sucursal (expandido) */}
                        {isExpanded && pivotData.map((branchItem: any) => {
                          const branchName = branchItem.sucursal || branchItem.sede;
                          const bCpe = parseFloat(branchItem.cpePayments?.[m.id] || 0);
                          const bNotes = parseFloat(branchItem.notePayments?.[m.id] || 0);
                          const bPurchases = parseFloat(branchItem.purchasePayments?.[m.id] || 0);
                          const bSaldo = bCpe + bNotes - bPurchases;

                          return (
                            <tr key={branchName} className="hover:bg-slate-50/50 transition-colors border-l-2 border-indigo-100">
                              <td className="py-2 pl-12 pr-4">
                                <div className="flex items-center gap-1.5">
                                  <Building2 size={11} className="text-slate-400 shrink-0" />
                                  <span className="text-[11px] text-slate-600 font-medium">{branchName}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right text-[11px] text-slate-500 tabular-nums">
                                {formatCurrency(bCpe)}
                              </td>
                              <td className="py-2 px-3 text-right text-[11px] text-slate-500 tabular-nums">
                                {formatCurrency(bNotes)}
                              </td>
                              <td className="py-2 px-3 text-right text-[11px] text-slate-300/80 tabular-nums">
                                S/. 0.00
                              </td>
                              <td className="py-2 px-3 text-right text-[11px] text-rose-500/80 tabular-nums">
                                {bPurchases > 0 ? `-${formatCurrency(bPurchases)}` : 'S/. 0.00'}
                              </td>
                              <td className="py-2 px-4 text-right text-[11px] font-semibold text-slate-700 tabular-nums">
                                {formatCurrency(bSaldo)}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* Fila de Totales Generales Consolidados */}
                  <tr className="bg-slate-800 text-white">
                    <td className="py-3 px-4 text-xs font-extrabold uppercase tracking-widest text-slate-200">
                      Total General
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold tabular-nums text-slate-100">
                      {formatCurrency(grandTotals.cpe)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold tabular-nums text-slate-100">
                      {formatCurrency(grandTotals.notes)}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold tabular-nums text-slate-400">
                      S/. 0.00
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold tabular-nums text-rose-400">
                      {grandTotals.purchases > 0 ? `-${formatCurrency(grandTotals.purchases)}` : 'S/. 0.00'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-extrabold tabular-nums text-white">
                      {formatCurrency(grandTotals.saldo)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección Analítica: Análisis por Hora */}
      <HourlySalesAnalysis data={hourlySales || []} isLoading={loadingHourly} />

    </div>
  );
};
