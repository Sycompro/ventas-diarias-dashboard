import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendPoint } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SalesTrendChartProps {
  data: TrendPoint[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const displayLabel = label && label.includes('-') ? formatDate(label) : label;
    return (
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 mb-1">{displayLabel}</p>
        <p className="text-lg font-bold text-slate-900">
          {formatCurrency(payload[0].value)}
        </p>
        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          {payload[0].payload.count} operaciones
        </p>
      </div>
    );
  }
  return null;
};

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <div className="h-[360px] w-full animate-pulse bg-slate-100 rounded-xl"></div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[360px] w-full flex items-center justify-center -2 -dashed rounded-xl bg-slate-50">
        <span className="text-slate-400 text-sm">No hay datos disponibles para la tendencia</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Evolución de Ventas</h3>
          <p className="text-sm text-slate-500">Comportamiento diario en el periodo</p>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              dy={15}
              tickFormatter={(val) => {
                const parts = val.split('-');
                return parts.length === 3 ? parts[2] : val;
              }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(val) => `S/.${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSales)" 
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, className: '' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
