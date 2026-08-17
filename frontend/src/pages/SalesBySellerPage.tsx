import React from 'react';
import { Users } from 'lucide-react';
import { RankingBarChart } from '../components/charts/RankingBarChart';
import { useSalesBySeller } from '../hooks/useSalesMetrics';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency } from '../utils/formatters';
import { Skeleton } from '../components/ui/Skeleton';

const columns = [
  { 
    header: 'Vendedor', 
    key: 'name',
    render: (item: any) => <span className="font-semibold text-slate-800">{item.name || item.sellerName}</span>
  },
  { 
    header: 'Operaciones', 
    key: 'count',
    render: (item: any) => <span className="tabular-nums font-medium text-slate-600">{item.count} ops</span>
  },
  { 
    header: 'Ticket Promedio', 
    key: 'avgTicket',
    render: (item: any) => <span className="tabular-nums">{formatCurrency(item.avgTicket)}</span>
  },
  { 
    header: 'Total Vendido', 
    key: 'total',
    render: (item: any) => <span className="font-bold text-primary tabular-nums">{formatCurrency(item.total)}</span>
  },
];

export const SalesBySellerPage: React.FC = () => {
  const { data, isLoading } = useSalesBySeller();

  const formattedChartData = (data || []).map((s: any, idx: number) => ({
    id: String(idx),
    name: s.name || s.sellerName,
    value: s.total,
    secondaryValue: `${s.count} ops`
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Users className="text-primary" /> Ventas por Vendedor
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Rendimiento y ranking del equipo de ventas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? <Skeleton variant="chart" /> : (
            <RankingBarChart 
              title="Ranking de Vendedores" 
              data={formattedChartData} 
            />
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-4  bg-neutral-50">
          <h3 className="font-semibold text-neutral-900">Desglose por Vendedor</h3>
        </div>
        <div className="p-4">
          <DataTable title="Desglose por Vendedor" columns={columns} data={data || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
