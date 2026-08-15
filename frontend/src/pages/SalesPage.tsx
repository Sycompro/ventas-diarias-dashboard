import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { SalesTrendChart } from '../components/charts/SalesTrendChart';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const columns = [
  {
    header: 'Fecha',
    accessorKey: 'issuedAt',
    cell: (info: any) => formatDateTime(info.getValue()),
  },
  {
    header: 'Documento',
    accessorFn: (row: any) => `${row.series}-${row.number}`,
  },
  {
    header: 'Cliente',
    accessorKey: 'customerName',
  },
  {
    header: 'Vendedor',
    accessorKey: 'sellerName',
  },
  {
    header: 'Total',
    accessorKey: 'total',
    cell: (info: any) => (
      <span className="font-medium text-neutral-900">{formatCurrency(info.getValue())}</span>
    ),
  },
  {
    header: 'Estado',
    accessorKey: 'status',
    cell: (info: any) => {
      const status = info.getValue();
      const config = {
        'pagado': 'bg-success-light text-success-dark',
        'pendiente': 'bg-warning-light text-warning-dark',
        'anulado': 'bg-danger-light text-danger-dark'
      }[status as string] || 'bg-neutral-100 text-neutral-600';
      
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${config}`}>
          {status}
        </span>
      );
    }
  }
];

const mockDocuments = Array.from({ length: 20 }, (_, i) => ({
  id: `doc-${i}`,
  series: i % 3 === 0 ? 'F001' : 'B001',
  number: (1000 + i).toString(),
  issuedAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  customerName: `Cliente ${i + 1}`,
  sellerName: i % 2 === 0 ? 'Ana García' : 'Carlos López',
  total: Math.random() * 5000 + 100,
  status: i % 10 === 0 ? 'anulado' : (i % 5 === 0 ? 'pendiente' : 'pagado')
}));

export const SalesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <ShoppingCart className="text-primary" /> Ventas
          </h2>
          <p className="text-sm text-neutral-500 mt-1">Análisis detallado y registro de ventas.</p>
        </div>
        <button className="btn-primary">
          Exportar Excel
        </button>
      </div>

      <div className="card p-5">
        <SalesTrendChart />
      </div>

      <div className="card">
        <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-neutral-50">
          <h3 className="font-semibold text-neutral-900">Registro de Documentos</h3>
          <input 
            type="text" 
            placeholder="Buscar documento o cliente..." 
            className="input w-64 px-3 py-1.5"
          />
        </div>
        <div className="p-4">
          <DataTable 
            columns={columns} 
            data={mockDocuments} 
          />
        </div>
      </div>
    </div>
  );
};
