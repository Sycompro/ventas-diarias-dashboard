import React from 'react';
import { FileText } from 'lucide-react';
import { DocumentBarChart } from '../components/charts/DocumentBarChart';
import { useSalesByDocumentType } from '../hooks/useSalesMetrics';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency } from '../utils/formatters';

export const SalesByDocumentPage: React.FC = () => {
  const { data, isLoading } = useSalesByDocumentType();

  const tableData = data ? [
    { name: 'Facturas', amount: data.facturas.amount, count: data.facturas.count },
    { name: 'Boletas', amount: data.boletas.amount, count: data.boletas.count },
    { name: 'Notas de Crédito', amount: data.notasCredito.amount, count: data.notasCredito.count },
  ] : [];

  const columns = [
    { header: 'Tipo de Documento', accessorKey: 'name' },
    { header: 'Cantidad Emitida', accessorKey: 'count' },
    { 
      header: 'Monto Total', 
      accessorKey: 'amount',
      cell: (info: any) => {
        const val = info.getValue();
        return (
          <span className={`font-bold ${val < 0 ? 'text-danger' : 'text-neutral-900'}`}>
            {formatCurrency(val)}
          </span>
        );
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <FileText className="text-primary" /> Análisis por Tipo de Documento
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Distribución de comprobantes emitidos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <DocumentBarChart />
        </div>
        <div className="card">
          <div className="p-4 border-b border-border-subtle bg-neutral-50">
            <h3 className="font-semibold text-neutral-900">Resumen Consolidado</h3>
          </div>
          <div className="p-4">
            <DataTable columns={columns} data={tableData} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};
