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

export const DashboardPage: React.FC = () => {
  const { datePreset, dateStart, dateEnd, granularity } = useFilters();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics();
  const { data: trendData, isLoading: loadingTrend } = useSalesTrend();
  const { data: paymentData, isLoading: loadingPayment } = useSalesByPayment();
  const { data: documentData, isLoading: loadingDocument } = useSalesByDocumentType();
  const { data: topProducts, isLoading: loadingProducts } = useTopProducts();
  const { data: sellersData, isLoading: loadingSellers } = useSalesBySeller();
  const { data: detailedPayments, isLoading: loadingDetailed } = useDetailedPaymentMetrics();

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const userName = "Carlos";

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

  const trafficIndicators = [
    { label: 'Ventas Mensuales', description: 'Por encima del promedio histórico (+15%)', status: 'healthy' as TrafficStatus },
    { label: 'Cumplimiento de Meta', description: 'Meta mensual alcanzada al 85%', status: 'healthy' as TrafficStatus },
    { label: 'Ticket Promedio', description: 'Leve caída respecto a la semana pasada', status: 'attention' as TrafficStatus },
    { label: 'Stock Crítico', description: '12 productos estrella por agotarse', status: 'critical' as TrafficStatus },
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
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1">
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <KpiCard
          title="Ventas Hoy"
          value={metrics?.totalSales ? metrics.totalSales * 0.15 : 4500}
          previousValue={4200}
          format="currency"
          icon={DollarSign}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KpiCard
          title="Ventas del Mes"
          value={metrics?.totalSales || 35000}
          previousValue={30000}
          format="currency"
          icon={TrendingUp}
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
