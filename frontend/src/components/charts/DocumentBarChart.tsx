import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface DocumentBarChartProps {
  data: {
    facturas: { count: number; amount: number };
    boletas: { count: number; amount: number };
    notasCredito: { count: number; amount: number };
  };
  isLoading?: boolean;
}

export const DocumentBarChart: React.FC<DocumentBarChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <div className="h-[360px] w-full animate-pulse bg-slate-100 rounded-xl"></div>;
  }

  const chartData = [
    { 
      name: 'Documentos', 
      Facturas: data?.facturas?.amount || 0, 
      Boletas: data?.boletas?.amount || 0, 
      'Notas de Crédito': Math.abs(data?.notasCredito?.amount || 0) 
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl min-w-[200px]">
          <p className="text-sm font-semibold text-slate-900 mb-3 pb-2">Comprobantes Emitidos</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-6 mb-2.5 last:mb-0">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></span>
                <span className="text-sm font-medium text-slate-600">{entry.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col h-full">
      <h3 className="text-lg font-semibold text-slate-900 mb-1">Tipos de Comprobante</h3>
      <p className="text-sm text-slate-500 mb-6">Monto total por tipo de documento</p>
      
      <div className="flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={50}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} dy={10} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(val) => `S/.${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.5 }} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
            <Bar dataKey="Facturas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Boletas" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Notas de Crédito" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
