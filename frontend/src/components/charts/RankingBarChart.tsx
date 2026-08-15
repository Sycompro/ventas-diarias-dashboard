import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Trophy } from 'lucide-react';

interface RankingItem {
  id: string;
  name: string;
  value: number;
  secondaryValue?: string;
}

interface RankingBarChartProps {
  title: string;
  subtitle?: string;
  data: RankingItem[];
  isLoading?: boolean;
}

export const RankingBarChart: React.FC<RankingBarChartProps> = ({ title, subtitle, data, isLoading }) => {
  if (isLoading) {
    return <div className="h-[360px] w-full animate-pulse bg-slate-100 rounded-xl"></div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[360px] w-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <span className="text-slate-400 text-sm">Sin datos para el ranking</span>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 5);
  const maxValue = sortedData[0]?.value || 1;

  const getRankStyle = (index: number) => {
    switch(index) {
      case 0: return 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm'; // Oro
      case 1: return 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm'; // Plata
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200 shadow-sm'; // Bronce
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getBarColor = (index: number) => {
    switch(index) {
      case 0: return 'bg-blue-600';
      case 1: return 'bg-blue-500';
      case 2: return 'bg-blue-400';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
      </div>
      
      <div className="flex flex-col gap-6 flex-1 justify-center">
        {sortedData.map((item, index) => {
          const width = Math.max((item.value / maxValue) * 100, 5);
          
          return (
            <div key={item.id || index} className="group">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${getRankStyle(index)}`}>
                    #{index + 1}
                  </span>
                  <span className={`text-sm ${index < 3 ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                    {item.name}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(item.value)}</span>
                  {item.secondaryValue && <span className="text-xs text-slate-500">{item.secondaryValue}</span>}
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(index)}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
