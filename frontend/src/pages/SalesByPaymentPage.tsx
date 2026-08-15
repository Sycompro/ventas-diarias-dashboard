import React from 'react';
import { CreditCard } from 'lucide-react';
import { PaymentDonutChart } from '../components/charts/PaymentDonutChart';
import { useSalesByPayment } from '../hooks/useSalesMetrics';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency } from '../utils/formatters';
import { PAYMENT_METHODS } from '../utils/constants';

export const SalesByPaymentPage: React.FC = () => {
  const { data, isLoading } = useSalesByPayment();

  const tableData = data ? Object.entries(data).map(([key, value]: [string, any]) => {
    const methodKey = Object.keys(PAYMENT_METHODS).find(k => PAYMENT_METHODS[k].name.toLowerCase() === key.toLowerCase()) || 'default';
    const method = PAYMENT_METHODS[methodKey] || PAYMENT_METHODS['default'];
    return {
      name: method.name,
      amount: value.amount,
      count: value.count,
    };
  }).filter(item => item.amount > 0) : [];

  const columns = [
    { header: 'Método de Pago', accessorKey: 'name' },
    { header: 'Operaciones', accessorKey: 'count' },
    { 
      header: 'Monto Total', 
      accessorKey: 'amount',
      cell: (info: any) => <span className="font-bold text-neutral-900">{formatCurrency(info.getValue())}</span>
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <CreditCard className="text-primary" /> Ventas por Medio de Pago
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Análisis de la distribución de ingresos según el método de pago.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PaymentDonutChart />
        </div>
        <div className="lg:col-span-2 card">
          <div className="p-4 border-b border-border-subtle bg-neutral-50">
            <h3 className="font-semibold text-neutral-900">Desglose Detallado</h3>
          </div>
          <div className="p-4">
            <DataTable columns={columns} data={tableData} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};
