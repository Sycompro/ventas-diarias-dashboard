import React from 'react';
import { Trophy, Award, User, TrendingUp, Users } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface SellerItem {
  sellerName?: string;
  name?: string;
  total: number;
  count: number;
  avgTicket?: number;
}

interface SellersLeaderboardCardProps {
  sellers?: SellerItem[];
  isLoading?: boolean;
}

export const SellersLeaderboardCard: React.FC<SellersLeaderboardCardProps> = ({ 
  sellers = [], 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm animate-pulse space-y-3">
        <div className="h-5 bg-slate-100 rounded w-1/3"></div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Ordenar de mayor venta a menor venta
  const sortedSellers = [...sellers].sort((a, b) => b.total - a.total);
  const maxTotal = sortedSellers.length > 0 && sortedSellers[0].total > 0 ? sortedSellers[0].total : 1;
  const overallTotal = sortedSellers.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/60 shadow-xs">
            <Trophy size={15} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-xs tracking-tight">
              Ranking de Vendedores
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">De mayor a menor facturación</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
          <Users size={10} /> {sortedSellers.length} {sortedSellers.length === 1 ? 'vendedor' : 'vendedores'}
        </span>
      </div>

      {/* Lista de Vendedores */}
      <div className="my-3 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
        {sortedSellers.length === 0 || overallTotal === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No se registran ventas de vendedores en el periodo.
          </div>
        ) : (
          sortedSellers.map((seller, idx) => {
            const name = seller.sellerName || seller.name || 'Sin Vendedor';
            const percentage = overallTotal > 0 ? (seller.total / overallTotal) * 100 : 0;
            const progressWidth = maxTotal > 0 ? (seller.total / maxTotal) * 100 : 0;

            // Medallas / Badges de posición
            let rankBadge = (
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                #{idx + 1}
              </span>
            );

            if (idx === 0) {
              rankBadge = (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                  🥇
                </span>
              );
            } else if (idx === 1) {
              rankBadge = (
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                  🥈
                </span>
              );
            } else if (idx === 2) {
              rankBadge = (
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                  🥉
                </span>
              );
            }

            return (
              <div 
                key={name + idx}
                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {rankBadge}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {seller.count} {seller.count === 1 ? 'operación' : 'operaciones'} · {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 block tabular-nums">
                      {formatCurrency(seller.total)}
                    </span>
                    {seller.avgTicket ? (
                      <span className="text-[10px] font-semibold text-indigo-600 block tabular-nums">
                        Prom: {formatCurrency(seller.avgTicket)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200/70 mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Total */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-medium">Total Ventas Vendedores:</span>
        <span className="font-extrabold text-slate-900 tabular-nums">
          {formatCurrency(overallTotal)}
        </span>
      </div>

    </div>
  );
};
