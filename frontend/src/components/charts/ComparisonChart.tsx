import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const mockData = [
  { name: 'Ene', period1: 45000, period2: 38000 },
  { name: 'Feb', period1: 52000, period2: 41000 },
  { name: 'Mar', period1: 48000, period2: 45000 },
  { name: 'Abr', period1: 61000, period2: 50000 },
  { name: 'May', period1: 59000, period2: 55000 },
  { name: 'Jun', period1: 65000, period2: 58000 },
];

export const ComparisonChart: React.FC = () => {
  return (
    <div className="card p-5 w-full h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Comparativa de Períodos</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(val) => `S/. ${val / 1000}k`}
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="period1" name="Período Actual" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="period2" name="Período Anterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
