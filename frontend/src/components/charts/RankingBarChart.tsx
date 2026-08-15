import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface RankingBarChartProps {
  title: string;
  data: Array<{ name: string; total: number; [key: string]: any }>;
  dataKey?: string;
  nameKey?: string;
  color?: string;
  format?: 'currency' | 'number';
}

export const RankingBarChart: React.FC<RankingBarChartProps> = ({ 
  title, 
  data, 
  dataKey = 'total', 
  nameKey = 'name',
  color = '#4f46e5',
  format = 'currency'
}) => {
  const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]).slice(0, 5); // Top 5

  return (
    <div className="card p-5 w-full h-[400px] flex flex-col">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">{title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
            <XAxis 
              type="number" 
              hide 
            />
            <YAxis 
              dataKey={nameKey} 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
              width={100}
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [format === 'currency' ? formatCurrency(value) : value, 'Total']}
            />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={32}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? color : `${color}99`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
