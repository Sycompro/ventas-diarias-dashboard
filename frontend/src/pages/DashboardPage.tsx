import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Receipt, 
  Target, 
  Bell, 
  RefreshCw, 
  Download 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { 
  useDashboardMetrics, 
  useSalesTrend, 
  useSalesByPayment, 
  useSalesByDocumentType,
  useTopProducts,
  useSalesBySeller,
  useDetailedPaymentMetrics
} from '../hooks/useSalesMetrics';

import { KpiCard } from '../components/ui/KpiCard';
import { SalesTrendChart } from '../components/charts/SalesTrendChart';
import { PaymentDonutChart } from '../components/charts/PaymentDonutChart';
import { RankingBarChart } from '../components/charts/RankingBarChart';
import { DocumentBarChart } from '../components/charts/DocumentBarChart';
import { HourlyHeatmap } from '../components/charts/HourlyHeatmap';
import { DataTable, Column } from '../components/ui/DataTable';
import { InsightCard } from '../components/ui/InsightCard';
import { useFilters } from '../hooks/useFilters';
import { formatCurrency } from '../utils/formatters';
import { useAuthStore } from '../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { intelligenceService, companyService } from '../services/api';
import { GlobalFilters } from '../components/filters/GlobalFilters';
import { useHeaderStore } from '../hooks/useHeader';

export const DashboardPage: React.FC = () => {
  const { companyId, datePreset, dateStart, dateEnd, granularity } = useFilters();
  const token = useAuthStore((state) => state.accessToken);

  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics();
  const { data: trendData, isLoading: loadingTrend } = useSalesTrend();
  const { data: paymentData, isLoading: loadingPayment } = useSalesByPayment();
  const { data: documentData, isLoading: loadingDocument } = useSalesByDocumentType();
  const { data: topProducts, isLoading: loadingProducts } = useTopProducts();
  const { data: sellersData, isLoading: loadingSellers } = useSalesBySeller();
  const { data: detailedPayments, isLoading: loadingDetailed } = useDetailedPaymentMetrics();

  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!companyId) return;
    setIsSyncing(true);
    try {
      await companyService.sync(companyId);
      queryClient.invalidateQueries();
    } catch (err) {
      console.error("Error triggering sync:", err);
    } finally {
      setIsSyncing(false);
    }
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

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const user = useAuthStore((state) => state.user);
  const userName = user?.name || "Empresa";

  useEffect(() => {
    setHeader(
      `Buenos días, ${userName}`,
      today,
      <>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 py-1 px-2 bg-white border border-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-semibold rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
        <button 
          onClick={handleExport}
          className="inline-flex items-center gap-1 py-1 px-2.5 bg-slate-900 text-white text-[10px] sm:text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <Download className="w-3 h-3" />
          Exportar
        </button>
      </>
    );
    return () => clearHeader();
  }, [userName, today, isSyncing, companyId, dateStart, dateEnd, token]);

  const sellersRanking = sellersData?.map((s: any) => ({
    id: s.sellerName,
    name: s.sellerName,
    value: s.total,
    secondaryValue: `${s.count} ventas`
  })) || [];

  const productColumns: Column<any>[] = [
    { key: 'name', header: 'Producto', sortable: true, render: (item) => <span className="font-medium text-slate-800">{item.name}</span> },
    { key: 'category', header: 'Categoría', sortable: true, render: (item) => (
      <span className="px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-full text-xs font-medium">{item.category}</span>
    )},
    { key: 'quantity', header: 'Cantidad', sortable: true, render: (item) => <span className="tabular-nums">{item.quantity} unds.</span> },
    { key: 'total', header: 'Ingresos', sortable: true, render: (item) => <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(item.total)}</span> }
  ];

  return (
    <div className="space-y-6">

      {/* Barra de Filtros Globales */}
      <div className="mb-6 animate-in fade-in duration-500">
        <GlobalFilters />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <KpiCard
          title="Ventas del Período"
          value={metrics?.totalSales || 0}
          previousValue={metrics?.comparison?.previousTotal || 0}
          format="currency"
          icon={DollarSign}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KpiCard
          title="Documentos Emitidos"
          value={metrics?.totalDocuments || 0}
          previousValue={0}
          format="number"
          icon={Receipt}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Evolución de Ventas - Ancho Completo */}
      {(dateStart !== dateEnd || granularity === 'hour') && (
        <div className="mb-5 animate-in fade-in duration-700 delay-200 fill-mode-both">
          <SalesTrendChart data={trendData || []} isLoading={loadingTrend} />
        </div>
      )}

      {/* Distribución de Medios de Pago - Panel Amplio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 animate-in fade-in duration-700 delay-250 fill-mode-both">
        <div className="lg:col-span-1">
          <PaymentDonutChart data={paymentData || {}} detailedPayments={detailedPayments} isLoading={loadingPayment || loadingDetailed} />
        </div>
        <div className="lg:col-span-2">
          <DataTable 
            title="Distribución de Medios de Pago por Sede y Vendedor"
            columns={[
              { 
                header: 'Medio de Pago', 
                key: 'method',
                render: (item: any) => {
                  const colorClassMap: Record<string, string> = {
                    'tarjeta': 'bg-indigo-50 text-indigo-700',
                    'tarjeta de débito': 'bg-indigo-50 text-indigo-700',
                    'tarjeta de debito': 'bg-indigo-50 text-indigo-700',
                    'tarjeta crédito visa': 'bg-indigo-50 text-indigo-700',
                    'tarjeta credito visa': 'bg-indigo-50 text-indigo-700',
                    'efectivo': 'bg-emerald-50 text-emerald-700',
                    'contado': 'bg-emerald-50 text-emerald-700',
                    'transferencia': 'bg-blue-50 text-blue-700',
                    'yape': 'bg-purple-50 text-purple-700',
                    'plin': 'bg-teal-50 text-teal-700',
                    'yape / plin': 'bg-violet-50 text-violet-700'
                  };
                  const colorClass = colorClassMap[item.method.toLowerCase()] || 'bg-slate-50 text-slate-700';
                  return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                      {item.method}
                    </span>
                  );
                }
              },
              { key: 'company', header: 'Sede / Sucursal' },
              { key: 'seller', header: 'Vendedor' },
              { key: 'count', header: 'Operaciones', render: (item: any) => <span className="tabular-nums">{item.count} ops</span> },
              { key: 'amount', header: 'Total Recaudado', render: (item: any) => <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(item.amount)}</span> }
            ]}
            data={detailedPayments || []}
            isLoading={loadingDetailed || loadingPayment}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 animate-in fade-in duration-700 delay-300 fill-mode-both">
        <div className="lg:col-span-1">
          <RankingBarChart 
            title="Top Vendedores" 
            subtitle="Por volumen de ventas mensual"
            data={sellersRanking} 
            isLoading={loadingSellers} 
          />
        </div>
        <div className="lg:col-span-1">
          <DocumentBarChart data={documentData || { facturas: {count:0, amount:0}, boletas: {count:0, amount:0}, notasCredito: {count:0, amount:0}, notasVenta: {count:0, amount:0} }} isLoading={loadingDocument} />
        </div>
        <div className="lg:col-span-1">
          <HourlyHeatmap isLoading={loadingTrend} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in duration-700 delay-500 fill-mode-both">
        <div className="lg:col-span-2">
          <DataTable 
            title="Top Productos Más Vendidos" 
            columns={productColumns} 
            data={topProducts || []} 
            isLoading={loadingProducts} 
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-3">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Insights Automáticos</h2>
          <InsightCard 
            type="positive"
            title="Crecimiento sostenido"
            description="Las ventas del último trimestre muestran un incremento del 15% comparado con el periodo anterior. El rendimiento se mantiene sólido."
            dataPoint="+15.4%"
            dataLabel="Variación Trimestral"
          />
          <InsightCard 
            type="warning"
            title="Oportunidad en Medios de Pago"
            description="Las transferencias bancarias están tomando más tiempo en conciliación. Se sugiere incentivar el uso de billeteras digitales."
            dataPoint="35%"
            dataLabel="Pagos Manuales"
          />
        </div>
      </div>

    </div>
  );
};
