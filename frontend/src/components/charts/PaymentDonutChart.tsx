import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, Building2, User } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface PaymentDonutProps {
  data: Record<string, { count: number; amount: number; description?: string }>;
  detailedPayments?: Array<{ method: string; company: string; seller: string; amount: number }>;
  isLoading?: boolean;
}

const getPaymentMethodColor = (name: string): string => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('efectivo') || nameLower.includes('contado')) return '#10b981'; // green
  if (nameLower.includes('yape')) return '#8b5cf6'; // purple
  if (nameLower.includes('plin')) return '#06b6d4'; // cyan/turquoise
  if (nameLower.includes('transferencia')) return '#3b82f6'; // blue
  if (nameLower.includes('tarjeta') || nameLower.includes('visa') || nameLower.includes('mastercard')) return '#6366f1'; // indigo
  
  return '#94a3b8'; // grey
};

export const PaymentDonutChart: React.FC<PaymentDonutProps> = ({ data, detailedPayments, isLoading }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (isLoading) return <div className="h-[360px] w-full animate-pulse bg-slate-100 rounded-xl"></div>;

  const chartData = Object.entries(data || {})
    .filter(([_, val]) => val.amount > 0)
    .map(([key, val]) => {
      const description = val.description || (key === '01' ? 'Efectivo' : `Método ${key}`);
      return {
        name: description,
        value: val.amount,
        color: getPaymentMethodColor(description)
      };
    })
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="h-[360px] w-full flex items-center justify-center rounded-xl bg-slate-50">
        <span className="text-slate-400 text-sm">Sin datos de pago</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-xl min-w-[140px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <span className="text-sm font-semibold text-slate-900">{data.name}</span>
          </div>
          <p className="text-sm font-medium text-slate-700">{formatCurrency(data.value)}</p>
          <p className="text-xs text-slate-500 mt-1 pt-1">
            {((data.value / total) * 100).toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const getBreakdown = (methodName: string) => {
    if (!detailedPayments) return [];
    return detailedPayments
      .filter((item: any) => item.method.toLowerCase() === methodName.toLowerCase())
      .map((item: any) => ({
        company: item.company,
        seller: item.seller,
        amount: item.amount
      }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col h-full animate-fade-in">
      <h3 className="text-base font-semibold text-slate-900 mb-1">Medios de Pago</h3>
      <p className="text-xs text-slate-500 mb-5">Distribución de ingresos por sucursal y vendedor</p>
      
      <div className="flex-1 relative min-h-[200px] mb-4">
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
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Total</span>
          <span className="text-lg font-extrabold text-slate-900">{formatCurrency(total)}</span>
        </div>
      </div>
      
      {/* Lista interactiva con acordeón de desglose detallado */}
      <div className="flex flex-col gap-2">
        {chartData.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          const breakdown = getBreakdown(item.name);
          
          return (
            <div key={idx} className="flex flex-col rounded-lg overflow-hidden transition-all duration-200">
              
              {/* Botón Cabecera del Método de Pago */}
              <button 
                onClick={() => toggleExpand(idx)}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                  isExpanded ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50/55'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-xs font-semibold">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(item.value)}</span>
                  <span className="text-[10px] font-medium text-slate-400 w-8 text-right">{((item.value / total) * 100).toFixed(0)}%</span>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
              </button>

              {/* Contenido Acordeón Desplegado */}
              {isExpanded && (
                <div className="bg-slate-50/60 px-3.5 pb-3 pt-1.5 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                  {breakdown.length > 0 ? (
                    breakdown.map((row, rIdx) => (
                      <div key={rIdx} className="flex items-center justify-between text-[11px] text-slate-600 pl-4 relative">
                        {/* Pequeña guía visual vertical minimalista (punto) */}
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 absolute left-1 top-1/2 -translate-y-1/2"></span>
                        
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Building2 size={10} className="text-slate-400" /> {row.company}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <User size={10} className="text-slate-400" /> {row.seller}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(row.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic pl-4">No hay desglose disponible</span>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
