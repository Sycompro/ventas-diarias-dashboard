import React from 'react';
import { Crown, Trophy, Sparkles, Users, TrendingUp, Receipt, Award } from 'lucide-react';
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
        <div className="h-5 bg-slate-100 rounded-lg w-1/3"></div>
        <div className="h-28 bg-slate-100 rounded-2xl"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  // Ordenar de mayor venta a menor venta
  const sortedSellers = [...sellers].sort((a, b) => b.total - a.total);
  const maxTotal = sortedSellers.length > 0 && sortedSellers[0].total > 0 ? sortedSellers[0].total : 1;
  const overallTotal = sortedSellers.reduce((sum, s) => sum + s.total, 0);
  const overallCount = sortedSellers.reduce((sum, s) => sum + s.count, 0);
  const teamAvgTicket = overallCount > 0 ? overallTotal / overallCount : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl shadow-xs">
            <Trophy size={15} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs tracking-tight flex items-center gap-1.5">
              Ranking de Vendedores
              <Sparkles size={11} className="text-amber-500" />
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Top rendimiento por facturación</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1">
          <Users size={11} className="text-amber-600" />
          {sortedSellers.length} {sortedSellers.length === 1 ? 'vendedor activo' : 'vendedores'}
        </span>
      </div>

      {/* Lista de Vendedores */}
      <div className="my-3 space-y-3 max-h-[260px] overflow-y-auto pr-1">
        {sortedSellers.length === 0 || overallTotal === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No se registran ventas de vendedores en el periodo.
          </div>
        ) : (
          sortedSellers.map((seller, idx) => {
            const name = seller.sellerName || seller.name || 'Sin Vendedor';
            const percentage = overallTotal > 0 ? (seller.total / overallTotal) * 100 : 0;
            const progressWidth = maxTotal > 0 ? (seller.total / maxTotal) * 100 : 0;
            const initials = name.slice(0, 2).toUpperCase();

            // Estilos diferenciados
            const isLeader = idx === 0;
            const isSilver = idx === 1;
            const isBronze = idx === 2;

            if (isLeader) {
              return (
                <div 
                  key={name + idx}
                  className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white border border-amber-300/90 relative overflow-hidden shadow-xs hover:border-amber-400 transition-all duration-200"
                >
                  {/* Subtle watermark crown */}
                  <Crown size={72} className="absolute -bottom-5 -right-3 text-amber-500/10 pointer-events-none select-none" />

                  {/* Top row: Avatar + Name + Leader Badge + Total */}
                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar con corona */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-black flex items-center justify-center shadow-md ring-2 ring-amber-200">
                          {initials}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-amber-400 text-slate-900 rounded-full shadow-xs ring-1 ring-white">
                          <Crown size={10} className="fill-current text-white" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0 flex items-center gap-0.5">
                            🥇 #1 Líder
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 font-medium">
                          <span className="font-semibold text-slate-700">{seller.count} {seller.count === 1 ? 'operación' : 'operaciones'}</span>
                          <span>•</span>
                          <span className="font-bold text-amber-800">{percentage.toFixed(0)}% del total</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 block tabular-nums">
                        {formatCurrency(seller.total)}
                      </span>
                      {seller.avgTicket ? (
                        <span className="text-[10px] font-semibold text-indigo-700 block tabular-nums mt-0.5">
                          Prom: {formatCurrency(seller.avgTicket)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Progress Bar Estilizada con Gradiente */}
                  <div className="mt-3 relative z-10">
                    <div className="w-full h-2 rounded-full bg-amber-200/60 p-0.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 transition-all duration-700 shadow-xs"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            }

            // Puestos 2, 3 y siguientes
            return (
              <div 
                key={name + idx}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  isSilver 
                    ? 'bg-slate-50/80 border-slate-200' 
                    : isBronze 
                    ? 'bg-orange-50/40 border-orange-200/70' 
                    : 'bg-white border-slate-100 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-xl text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs ${
                      isSilver 
                        ? 'bg-slate-200 text-slate-700 border border-slate-300' 
                        : isBronze 
                        ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {seller.count} {seller.count === 1 ? 'doc' : 'docs'} · {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 block tabular-nums">
                      {formatCurrency(seller.total)}
                    </span>
                    {seller.avgTicket ? (
                      <span className="text-[10px] font-semibold text-slate-400 block tabular-nums">
                        Prom: {formatCurrency(seller.avgTicket)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSilver ? 'bg-slate-400' : isBronze ? 'bg-amber-600' : 'bg-indigo-400'
                    }`}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Resumen 3 KPIs */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-slate-400 text-[10px] block font-medium">Ticket Promedio Equipo</span>
          <span className="font-extrabold text-slate-800 text-xs tabular-nums">
            {formatCurrency(teamAvgTicket)}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-right">
          <span className="text-slate-400 text-[10px] block font-medium">Total Facturado</span>
          <span className="font-black text-slate-900 text-xs tabular-nums">
            {formatCurrency(overallTotal)}
          </span>
        </div>
      </div>

    </div>
  );
};
