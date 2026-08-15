import React, { useState } from 'react';
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
import { TrafficLight, TrafficStatus } from '../components/ui/TrafficLight';
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

  // Fetch Health Status dynamically
  const { data: healthData } = useQuery({
    queryKey: ['health-status', companyId],
    queryFn: () => intelligenceService.getHealth(),
    enabled: !!companyId
  });

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

  const getTrafficStatus = (val: string | undefined): TrafficStatus => {
    if (val === 'critical') return 'critical';
    if (val === 'attention') return 'attention';
    return 'healthy';
  };

  const trafficIndicators = [
    { 
      label: 'Ventas Mensuales', 
      description: healthData?.sales === 'critical' 
        ? 'Caída severa de ventas detectada' 
        : healthData?.sales === 'attention' 
          ? 'Leve caída respecto al promedio diario' 
          : 'Ventas dentro del promedio saludable', 
      status: getTrafficStatus(healthData?.sales) 
    },
    { 
      label: 'Cumplimiento de Meta', 
      description: healthData?.goals === 'critical' 
        ? 'Crítico: Muy por debajo de la meta mensual' 
        : healthData?.goals === 'attention' 
          ? 'En camino a la meta, requiere atención' 
          : 'Meta mensual en buen progreso', 
      status: getTrafficStatus(healthData?.goals) 
    },
    { 
      label: 'Tendencia de Ventas', 
      description: healthData?.trends === 'critical' 
        ? 'Tendencia bajista preocupante en los últimos días' 
        : healthData?.trends === 'attention' 
          ? 'Tendencia stable con precauciones' 
          : 'Tendencia alcista o estable saludable', 
      status: getTrafficStatus(healthData?.trends) 
    },
    { 
      label: 'Estado Operacional', 
      description: healthData?.overall === 'critical' 
        ? 'Se requiere acción inmediata en las operaciones' 
        : healthData?.overall === 'attention' 
          ? 'Operación estable con áreas a vigilar' 
          : 'Operación empresarial totalmente saludable', 
      status: getTrafficStatus(healthData?.overall) 
    },
  ];

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Buenos días, {userName}</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize-first">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Barra de Filtros Globales */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 animate-in fade-in duration-500">
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

      <div className="mb-5 animate-in fade-in duration-700 delay-100 fill-mode-both">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Semáforo Empresarial</h2>
        <TrafficLight indicators={trafficIndicators} />
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
          <PaymentDonutChart data={paymentData || {}} isLoading={loadingPayment} />
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
                    'efectivo': 'bg-emerald-50 text-emerald-700',
                    'transferencia': 'bg-blue-50 text-blue-700',
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
          <DocumentBarChart data={documentData || { facturas: {count:0, amount:0}, boletas: {count:0, amount:0}, notasCredito: {count:0, amount:0} }} isLoading={loadingDocument} />
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
