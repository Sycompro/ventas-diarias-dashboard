import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface ComparisonData {
  date: string;
  current: number;
  previous: number;
}

interface ComparisonChartProps {
  data?: ComparisonData[];
  isLoading?: boolean;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <div className="h-[360px] w-full animate-pulse bg-slate-100 rounded-xl"></div>;
  }

  // Datos de ejemplo si no se proveen
  const chartData = data || Array.from({ length: 15 }).map((_, i) => {
    const prev = 3000 + Math.random() * 5000;
    return {
      date: `Día ${i + 1}`,
      previous: prev,
      current: prev * (0.8 + Math.random() * 0.4)
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length >= 2) {
      const current = payload[0].value;
      const previous = payload[1].value;
      const diff = current - previous;
      const isPositive = diff >= 0;

      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 min-w-[200px]">
          <p className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">{label}</p>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span className="text-sm font-medium text-slate-700">Periodo actual</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(current)}</span>
            </div>
            
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="text-sm font-medium text-slate-500">Periodo anterior</span>
              </div>
              <span className="text-sm font-medium text-slate-500">{formatCurrency(previous)}</span>
            </div>
          </div>
          
          <div className={`mt-3 pt-2.5 border-t border-slate-100 text-xs font-bold flex justify-between ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            <span>Diferencia</span>
            <span>{isPositive ? '+' : ''}{formatCurrency(diff)} ({isPositive ? '+' : ''}{((diff/previous)*100).toFixed(1)}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Comparativa de Periodos</h3>
        <p className="text-sm text-slate-500">Actual vs Anterior</p>
      </div>
      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(val) => `S/.${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
            
            <Area 
              name="Periodo actual"
              type="monotone" 
              dataKey="current" 
              stroke="#2563eb" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCurrent)" 
              activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2, className: 'drop-shadow-sm' }}
            />
            <Area 
              name="Periodo anterior"
              type="monotone" 
              dataKey="previous" 
              stroke="#94a3b8" 
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none" 
              activeDot={{ r: 4, fill: '#94a3b8', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
