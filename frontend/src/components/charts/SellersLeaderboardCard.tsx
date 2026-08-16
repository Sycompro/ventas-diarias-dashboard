import React from 'react';
import { Crown, Trophy, Medal, Sparkles, TrendingUp, Users, ArrowUpRight, CheckCircle2 } from 'lucide-react';
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
        <div className="h-24 bg-slate-100 rounded-2xl"></div>
        <div className="h-14 bg-slate-100 rounded-xl"></div>
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
          <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-600 text-white rounded-xl shadow-xs">
            <Trophy size={15} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs tracking-tight flex items-center gap-1.5">
              Ranking de Vendedores
              <Sparkles size={11} className="text-amber-500" />
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Rendimiento y volumen de facturación</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
          <Users size={11} className="text-slate-500" />
          {sortedSellers.length} {sortedSellers.length === 1 ? 'vendedor' : 'vendedores'}
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

            // Estilos diferenciados para el Líder (#1)
            const isLeader = idx === 0;
            const isSilver = idx === 1;
            const isBronze = idx === 2;

            if (isLeader) {
              return (
                <div 
                  key={name + idx}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white border border-amber-300/80 relative overflow-hidden shadow-xs hover:border-amber-400 transition-all duration-200"
                >
                  {/* Subtle watermark crown */}
                  <Crown size={64} className="absolute -bottom-4 -right-3 text-amber-500/10 pointer-events-none" />

                  {/* Top row: Avatar + Name + Tag + Total */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar con corona */}
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                          {initials}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-amber-400 text-white rounded-full shadow-xs">
                          <Crown size={9} />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300/80 shrink-0">
                            #1 Líder
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-medium">
                          <span>{seller.count} {seller.count === 1 ? 'doc' : 'docs'} emitidos</span>
                          <span>•</span>
                          <span className="font-bold text-amber-700">{percentage.toFixed(0)}% del total</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 block tabular-nums">
                        {formatCurrency(seller.total)}
                      </span>
                      {seller.avgTicket ? (
                        <span className="text-[10px] font-semibold text-slate-500 block tabular-nums">
                          Prom: {formatCurrency(seller.avgTicket)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Progress Bar Estilizada con Gradiente */}
                  <div className="mt-2.5">
                    <div className="w-full h-1.5 rounded-full bg-amber-200/50 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700 shadow-xs"
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
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                      isSilver 
                        ? 'bg-slate-200 text-slate-700' 
                        : isBronze 
                        ? 'bg-amber-200 text-amber-900' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {idx + 1}
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
                <div className="w-full h-1 rounded-full bg-slate-100 mt-2 overflow-hidden">
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

      {/* Footer Resumen */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 text-[10px] block font-medium">Ticket Promedio Equipo</span>
          <span className="font-bold text-slate-700 text-[11px] tabular-nums">
            {formatCurrency(teamAvgTicket)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 text-[10px] block font-medium">Total Facturado</span>
          <span className="font-black text-slate-900 text-xs tabular-nums">
            {formatCurrency(overallTotal)}
          </span>
        </div>
      </div>

    </div>
  );
};
