import React, { useState } from 'react';
import { CreditCard, Search, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { PaymentDonutChart } from '../components/charts/PaymentDonutChart';
import { useSalesByPayment, useDetailedPaymentMetrics } from '../hooks/useSalesMetrics';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatPercent } from '../utils/formatters';

export const SalesByPaymentPage: React.FC = () => {
  const { data: donutData, isLoading: loadingDonut } = useSalesByPayment();
  const { data: detailedData, isLoading: loadingDetailed } = useDetailedPaymentMetrics();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('Todos');

  // Obtener métodos únicos para el selector
  const methods = ['Todos', 'Tarjeta', 'Efectivo', 'Transferencia', 'Yape / Plin'];

  // Calcular total general de la recaudación
  const totalRevenue = detailedData?.reduce((acc: number, item: any) => acc + item.amount, 0) || 1;

  // Filtrar y preparar los datos de la tabla
  const tableData = detailedData
    ? detailedData
        .filter((item: any) => {
          const matchesSearch = 
            item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.method.toLowerCase().includes(searchTerm.toLowerCase());
          
          const matchesMethod = methodFilter === 'Todos' || item.method.toLowerCase() === methodFilter.toLowerCase();
          
          return matchesSearch && matchesMethod;
        })
        .map((item: any) => ({
          ...item,
          share: (item.amount / totalRevenue) * 100
        }))
    : [];

  const columns = [
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
    { header: 'Sede / Sucursal', key: 'company' },
    { header: 'Vendedor', key: 'seller' },
    { 
      header: 'Operaciones', 
      key: 'count',
      render: (item: any) => <span className="tabular-nums font-medium text-slate-600">{item.count} ops</span>
    },
    { 
      header: 'Monto Total', 
      key: 'amount',
      render: (item: any) => <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(item.amount)}</span>
    },
    {
      header: 'Participación',
      key: 'share',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-primary-500 h-full rounded-full" 
              style={{ width: `${Math.min(100, item.share * 4)}%` }} 
            />
          </div>
          <span className="text-xs text-slate-500 font-medium tabular-nums">{formatPercent(item.share)}</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="text-primary" /> Medios de Pago por Sede y Vendedor
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Análisis multidimensional de cobros y distribución de fondos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Donut */}
        <div className="lg:col-span-1">
          {donutData && <PaymentDonutChart data={donutData} isLoading={loadingDonut} />}
        </div>

        {/* Tabla Detallada Multidimensional */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Buscador de Texto */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por sede, vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 py-1.5 text-xs placeholder:text-slate-400"
              />
            </div>

            {/* Filtro Rápido de Método de Pago */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex gap-1.5">
                {methods.map((method) => (
                  <button
                    key={method}
                    onClick={() => setMethodFilter(method)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                      methodFilter === method
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <DataTable 
            title="Matriz de Distribución de Ingresos"
            columns={columns} 
            data={tableData} 
            isLoading={loadingDetailed} 
          />
        </div>
      </div>
    </div>
  );
};
