import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useSalesByPayment } from '../../hooks/useSalesMetrics';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../utils/constants';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { PieChart as PieChartIcon } from 'lucide-react';

export const PaymentDonutChart: React.FC = () => {
  const { data, isLoading } = useSalesByPayment();

  if (isLoading) return <Skeleton variant="chart" />;
  if (!data) return <EmptyState icon={PieChartIcon} title="Sin datos" description="No hay datos de pagos." />;

  // Transform object to array
  const chartData = Object.entries(data)
    .filter(([_, value]: [string, any]) => value.amount > 0)
    .map(([key, value]: [string, any]) => {
      const methodKey = Object.keys(PAYMENT_METHODS).find(k => PAYMENT_METHODS[k].name.toLowerCase() === key.toLowerCase()) || 'default';
      const method = PAYMENT_METHODS[methodKey] || PAYMENT_METHODS['default'];
      return {
        name: method.name,
        value: value.amount,
        count: value.count,
        color: method.color
      };
    })
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = (data.value / total) * 100;
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-border-subtle">
          <p className="font-semibold text-neutral-900 mb-1">{data.name}</p>
          <p className="text-neutral-700">{formatCurrency(data.value)}</p>
          <p className="text-neutral-500 text-sm">{data.count} operaciones ({formatPercent(percentage)})</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-5 w-full h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ventas por Medio de Pago</h3>
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-neutral-700 text-sm font-medium">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-sm text-neutral-500">Total</span>
          <span className="text-xl font-bold text-neutral-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};
