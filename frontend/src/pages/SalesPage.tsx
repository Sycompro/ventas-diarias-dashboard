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
  HelpCircle 
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { GlobalFilters } from '../components/filters/GlobalFilters';
import { useSalesPivot, useSalesDocuments } from '../hooks/useSalesMetrics';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useAuthStore } from '../hooks/useAuth';
import axios from 'axios';
import { useHeaderStore } from '../hooks/useHeader';

export const SalesPage: React.FC = () => {
  const { companyId, dateStart, dateEnd } = useFilters();
  const token = useAuthStore((state) => state.accessToken);
  
  const { data: pivotResponse, isLoading: loadingPivot } = useSalesPivot();
  const { data: documentsData, isLoading: loadingDocs } = useSalesDocuments(100, 0);
  
  const pivotData = pivotResponse?.pivotData || [];
  const paymentMethods = pivotResponse?.paymentMethods || [];

  const [expandedSedes, setExpandedSedes] = useState<Record<string, boolean>>({});
  const [docSearch, setDocSearch] = useState('');

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

  // Filtrar documentos en el cliente para el buscador
  const filteredDocs = useMemo(() => {
    if (!documentsData) return [];
    if (!docSearch.trim()) return documentsData;
    const query = docSearch.toLowerCase();
    return documentsData.filter((doc: any) => {
      const docNum = `${doc.series}-${doc.number}`.toLowerCase();
      const customer = (doc.customerName || '').toLowerCase();
      const seller = (doc.sellerName || '').toLowerCase();
      return docNum.includes(query) || customer.includes(query) || seller.includes(query);
    });
  }, [documentsData, docSearch]);

  return (
    <div className="space-y-6">

      {/* Filtros Globales */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-500">
        <GlobalFilters />
      </div>

      {/* Cuadro Estadístico Pivot - Solicitud de Usuario */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-700 delay-100">
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

      {/* Registro Detallado de Documentos en Base de Datos Real */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-700 delay-200">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-bold text-slate-900 text-sm">Listado Detallado de Comprobantes</h3>
          <div className="relative w-full sm:w-72">
            <input 
              type="text" 
              placeholder="Buscar por doc, cliente o vendedor..." 
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 placeholder:text-slate-400 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha Emisión</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4 text-right">Monto Total</th>
                <th className="py-3 px-4 text-center">Estado SUNAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loadingDocs ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 animate-pulse">
                    Cargando listado de comprobantes...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No se encontraron comprobantes registrados.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc: any) => {
                  const isVoided = doc.status === 'voided';
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-500 tabular-nums">{formatDateTime(doc.issuedAt)}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{doc.series}-{doc.number}</td>
                      <td className="py-2.5 px-4 text-slate-700 truncate max-w-[200px]" title={doc.customerName}>
                        {doc.customerName || 'Cliente Varios'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{doc.sellerName || 'Desconocido'}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-900 tabular-nums">{formatCurrency(doc.total)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize inline-block ${
                          isVoided 
                            ? 'bg-red-50 text-red-700 border border-red-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {isVoided ? 'Anulado' : 'Aceptado'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
