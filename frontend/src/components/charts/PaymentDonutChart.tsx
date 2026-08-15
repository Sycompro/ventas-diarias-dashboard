import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface PaymentDonutProps {
  data: Record<string, { count: number; amount: number }>;
  isLoading?: boolean;
}

const COLORS: Record<string, string> = {
  efectivo: '#10b981',
  tarjeta: '#6366f1',
  transferencia: '#3b82f6',
  yapePlin: '#8b5cf6',
  otros: '#94a3b8'
};

const LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  yapePlin: 'Yape / Plin',
  otros: 'Otros'
};

export const PaymentDonutChart: React.FC<PaymentDonutProps> = ({ data, isLoading }) => {
  if (isLoading) return <div className="h-[360px] w-full animate-pulse bg-slate-100 rounded-xl"></div>;

  const chartData = Object.entries(data || {})
    .filter(([_, val]) => val.amount > 0)
    .map(([key, val]) => ({
      name: LABELS[key] || key,
      value: val.amount,
      color: COLORS[key] || COLORS.otros
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="h-[360px] w-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <span className="text-slate-400 text-sm">Sin datos de pago</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 min-w-[140px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <span className="text-sm font-semibold text-slate-900">{data.name}</span>
          </div>
          <p className="text-sm font-medium text-slate-700">{formatCurrency(data.value)}</p>
          <p className="text-xs text-slate-500 mt-1 pt-1 border-t border-slate-50">
            {((data.value / total) * 100).toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Medios de Pago</h3>
      <p className="text-sm text-slate-500 mb-6">Distribución de ingresos</p>
      
      <div className="flex-1 relative min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius="68%"
              outerRadius="88%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total</span>
          <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>
      </div>
      
      <div className="mt-8 flex flex-col gap-3">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
              <span className="text-sm text-slate-700 font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
              <span className="text-xs font-medium text-slate-500 w-10 text-right">{((item.value / total) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
