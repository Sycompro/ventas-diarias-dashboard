import React from 'react';
import { Landmark, ReceiptText, Percent, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface TaxIgvCardProps {
  taxes?: {
    taxed: number;
    igv: number;
    exonerated: number;
    unaffected: number;
    total: number;
  };
  isLoading?: boolean;
}

export const TaxIgvCard: React.FC<TaxIgvCardProps> = ({ taxes, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm animate-pulse space-y-3">
        <div className="h-5 bg-slate-100 rounded-lg w-1/3"></div>
        <div className="h-20 bg-slate-100 rounded-2xl"></div>
        <div className="h-16 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  const taxed = taxes?.taxed || 0;
  const igv = taxes?.igv || 0;
  const exonerated = taxes?.exonerated || 0;
  const total = taxes?.total || (taxed + igv + exonerated);

  const igvPercent = total > 0 ? (igv / total) * 100 : 15.25;
  const taxedPercent = total > 0 ? (taxed / total) * 100 : 84.75;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs">
            <Landmark size={15} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs tracking-tight flex items-center gap-1.5">
              Desglose Tributario (IGV)
              <ShieldCheck size={12} className="text-emerald-500" />
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Base imponible y recaudación SUNAT</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
          IGV 18%
        </span>
      </div>

      {/* Tarjeta Destacada IGV Recaudado */}
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-sm relative overflow-hidden">
        {/* Subtle decorative circle */}
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-sm pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
            Total IGV Recaudado
          </span>
          <div className="p-1 rounded-lg bg-white/20 backdrop-blur-xs text-white">
            <Percent size={11} />
          </div>
        </div>
        <div className="mt-1">
          <div className="text-2xl font-black tabular-nums tracking-tight drop-shadow-xs">
            {formatCurrency(igv)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-100 mt-1 font-medium">
            <span>Aporte fiscal ({igvPercent.toFixed(1)}%)</span>
            <span>Tasa oficial 18%</span>
          </div>
        </div>
      </div>

      {/* Grid de Base Imponible & Total */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-slate-600 text-[11px] font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            Base Imponible (Gravado)
          </span>
          <span className="font-bold text-slate-900 tabular-nums text-xs">
            {formatCurrency(taxed)}
          </span>
        </div>

        {exonerated > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-600 text-[11px] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              Exonerado / Inafecto
            </span>
            <span className="font-bold text-slate-900 tabular-nums text-xs">
              {formatCurrency(exonerated)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
          <span className="text-slate-200 text-[11px] font-bold">
            Total Neto Facturado
          </span>
          <span className="font-black tabular-nums text-emerald-400 text-sm">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Barra de Proporción Fiscal */}
      <div className="mt-3 pt-2.5 border-t border-slate-100">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Base: {taxedPercent.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            IGV: {igvPercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
          <div 
            className="h-full bg-blue-500 transition-all duration-500" 
            style={{ width: `${taxedPercent}%` }} 
          />
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${igvPercent}%` }} 
          />
        </div>
      </div>

    </div>
  );
};
