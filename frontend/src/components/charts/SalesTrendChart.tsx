import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { useSalesTrend } from '../../hooks/useSalesMetrics';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { LineChart as LineChartIcon } from 'lucide-react';

export const SalesTrendChart: React.FC = () => {
  const { data, isLoading } = useSalesTrend();

  if (isLoading) return <Skeleton variant="chart" />;
  if (!data || data.length === 0) return <EmptyState icon={LineChartIcon} title="Sin datos" description="No hay datos de tendencia para el período seleccionado." />;

  return (
    <div className="card p-5 w-full h-[400px]">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Tendencia de Ventas</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(val) => {
                const date = new Date(val);
                return `${date.getDate()} ${date.toLocaleString('es-ES', { month: 'short' })}`;
              }}
              minTickGap={20}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(val) => `S/. ${val / 1000}k`}
              width={60}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelFormatter={(label) => formatDate(label as string)}
              formatter={(value: number) => [formatCurrency(value), 'Ventas']}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#4f46e5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSales)" 
              activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
