import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useSalesByDocumentType } from '../../hooks/useSalesMetrics';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { BarChart as BarChartIcon } from 'lucide-react';

export const DocumentBarChart: React.FC = () => {
  const { data, isLoading } = useSalesByDocumentType();
  const [viewMode, setViewMode] = useState<'amount' | 'count'>('amount');

  if (isLoading) return <Skeleton variant="chart" />;
  if (!data) return <EmptyState icon={BarChartIcon} title="Sin datos" description="No hay datos de documentos." />;

  const chartData = [
    { name: 'Facturas', amount: data.facturas.amount, count: data.facturas.count, color: '#3b82f6' },
    { name: 'Boletas', amount: data.boletas.amount, count: data.boletas.count, color: '#10b981' },
    { name: 'Notas de Crédito', amount: Math.abs(data.notasCredito.amount), count: data.notasCredito.count, color: '#ef4444' }
  ];

  return (
    <div className="card p-5 w-full h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Por Tipo de Documento</h3>
        <div className="flex bg-neutral-100 rounded-md p-1">
          <button 
            className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'amount' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
            onClick={() => setViewMode('amount')}
          >
            Monto
          </button>
          <button 
            className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'count' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
            onClick={() => setViewMode('count')}
          >
            Cantidad
          </button>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(val) => viewMode === 'amount' ? `S/. ${val / 1000}k` : val}
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [viewMode === 'amount' ? formatCurrency(value) : formatNumber(value), viewMode === 'amount' ? 'Monto' : 'Cantidad']}
            />
            <Bar dataKey={viewMode} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
