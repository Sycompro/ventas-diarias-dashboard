import React from 'react';
import { ShoppingCart, FileText, TrendingUp, CreditCard, Target, Bell } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { TrafficLight } from '../components/ui/TrafficLight';
import { SalesTrendChart } from '../components/charts/SalesTrendChart';
import { PaymentDonutChart } from '../components/charts/PaymentDonutChart';
import { DocumentBarChart } from '../components/charts/DocumentBarChart';
import { RankingBarChart } from '../components/charts/RankingBarChart';
import { useDashboardMetrics } from '../hooks/useSalesMetrics';
import { Skeleton } from '../components/ui/Skeleton';
import { InsightCard } from '../components/ui/InsightCard';

export const DashboardPage: React.FC = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Dashboard General</h2>
          <p className="text-sm text-neutral-500 mt-1">Visión general de las métricas clave de su negocio.</p>
        </div>
      </div>

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Ventas del Período"
          value={metrics?.totalSales || 0}
          previousValue={metrics?.comparison.previousTotal || 0}
          icon={ShoppingCart}
          color="primary"
          isLoading={isLoading}
        />
        <KpiCard
          title="Operaciones"
          value={metrics?.totalDocuments || 0}
          format="number"
          previousValue={120} // Mock previous
          icon={FileText}
          color="info"
          isLoading={isLoading}
        />
        <KpiCard
          title="Ticket Promedio"
          value={metrics?.avgTicket || 0}
          previousValue={45} // Mock previous
          icon={TrendingUp}
          color="success"
          isLoading={isLoading}
        />
        <KpiCard
          title="Ventas Tarjeta"
          value={metrics?.byPaymentMethod.tarjeta.amount || 0}
          icon={CreditCard}
          color="warning"
          isLoading={isLoading}
        />
        <KpiCard
          title="Cumplimiento Meta"
          value={85.4}
          format="percent"
          icon={Target}
          color="success"
          isLoading={isLoading}
        />
        <KpiCard
          title="Alertas Activas"
          value={3}
          format="number"
          icon={Bell}
          color="danger"
          isLoading={isLoading}
        />
      </div>

      {/* Row 2: Traffic Light & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <TrafficLight
            items={[
              { label: 'Volumen de Ventas', status: 'healthy', tooltip: 'Las ventas superan el promedio del mes pasado en un 15%' },
              { label: 'Ticket Promedio', status: 'attention', tooltip: 'El ticket promedio ha bajado un 5% esta semana' },
              { label: 'Metas de Vendedores', status: 'healthy', tooltip: 'El 80% de los vendedores están en meta' },
              { label: 'Anomalías Detectadas', status: 'critical', tooltip: 'Caída inusual de ventas en la sucursal Norte' },
            ]}
          />
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Insights Rápidos</h3>
            <div className="space-y-3">
              <InsightCard 
                type="opportunity"
                category="Ventas"
                title="Oportunidad de Upsell"
                description="Los clientes que compran Laptops suelen comprar mouse. Considera un combo."
              />
            </div>
          </div>
        </div>
        <div className="lg:col-span-3">
          <SalesTrendChart />
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton variant="chart" />
            <Skeleton variant="chart" />
            <Skeleton variant="chart" />
          </>
        ) : (
          <>
            <RankingBarChart 
              title="Top Vendedores" 
              data={(metrics?.bySeller || []).map((s: any) => ({ name: s.name || s.sellerName, total: s.total }))} 
              dataKey="total"
              color="#10b981"
            />
            <PaymentDonutChart />
            <DocumentBarChart />
          </>
        )}
      </div>
    </div>
  );
};
