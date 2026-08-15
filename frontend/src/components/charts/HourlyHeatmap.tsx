import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface HourlyData {
  hour: number;
  total: number;
  count: number;
}

// Generate mock data since there's no hook specifically for this
const mockData: HourlyData[] = Array.from({ length: 14 }, (_, i) => ({
  hour: i + 8, // 8 AM to 9 PM
  total: Math.floor(Math.random() * 5000) + 500,
  count: Math.floor(Math.random() * 20) + 2,
}));

export const HourlyHeatmap: React.FC = () => {
  
  const maxTotal = Math.max(...mockData.map(d => d.total));

  return (
    <div className="card p-5 w-full h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Ventas por Hora</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="hour" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(val) => `${val.toString().padStart(2, '0')}:00`}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(val) => `S/. ${val / 1000}k`}
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelFormatter={(label) => `${label.toString().padStart(2, '0')}:00 - ${(label + 1).toString().padStart(2, '0')}:00`}
              formatter={(value: number) => [formatCurrency(value), 'Ventas']}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {mockData.map((entry, index) => {
                // Opacity based on value relative to max
                const opacity = 0.4 + (entry.total / maxTotal) * 0.6;
                return <Cell key={`cell-${index}`} fill={`rgba(79, 70, 229, ${opacity})`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
