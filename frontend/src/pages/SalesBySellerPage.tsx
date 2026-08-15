import React from 'react';
import { Users } from 'lucide-react';
import { RankingBarChart } from '../components/charts/RankingBarChart';
import { useSalesBySeller } from '../hooks/useSalesMetrics';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency } from '../utils/formatters';
import { Skeleton } from '../components/ui/Skeleton';

const columns = [
  { header: 'Vendedor', accessorKey: 'sellerName' },
  { header: 'Operaciones', accessorKey: 'count' },
  { 
    header: 'Ticket Promedio', 
    accessorKey: 'avgTicket',
    cell: (info: any) => formatCurrency(info.getValue())
  },
  { 
    header: 'Total Vendido', 
    accessorKey: 'total',
    cell: (info: any) => <span className="font-bold text-primary">{formatCurrency(info.getValue())}</span>
  },
];

export const SalesBySellerPage: React.FC = () => {
  const { data, isLoading } = useSalesBySeller();

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
              data={data || []} 
              nameKey="sellerName"
              dataKey="total"
              color="#3b82f6"
            />
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-border-subtle bg-neutral-50">
          <h3 className="font-semibold text-neutral-900">Desglose por Vendedor</h3>
        </div>
        <div className="p-4">
          <DataTable columns={columns} data={data || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
