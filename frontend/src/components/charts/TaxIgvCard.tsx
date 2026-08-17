import React from 'react';
import { Landmark, ReceiptText, Percent, ShieldCheck, ArrowUpRight, Scale } from 'lucide-react';
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
        <div className="h-24 bg-slate-100 rounded-2xl"></div>
        <div className="h-16 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  const taxed = taxes?.taxed || 0;
  const igv = taxes?.igv || 0;
  const exonerated = taxes?.exonerated || 0;
  const total = taxes?.total || (taxed + igv + exonerated);

  const igvPercent = total > 0 ? (igv / total) * 100 : 0;
  const taxedPercent = total > 0 ? (taxed / total) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-xl shadow-xs">
            <Landmark size={15} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs tracking-tight flex items-center gap-1.5">
              Desglose Tributario (IGV)
              <ShieldCheck size={12} className="text-emerald-500" />
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Base imponible y recaudación fiscal</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
          SUNAT 18%
        </span>
      </div>

      {/* Tarjeta Destacada IGV Recaudado (Elegante Glassmorphism) */}
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-50/40 to-white border border-emerald-300/80 relative overflow-hidden shadow-2xs">
        {/* Subtle watermark */}
        <ReceiptText size={64} className="absolute -bottom-4 -right-3 text-emerald-500/10 pointer-events-none select-none" />

        <div className="flex items-center justify-between relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
            Total IGV Recaudado
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300/70 shadow-2xs">
            {igvPercent.toFixed(1)}% aporte fiscal
          </span>
        </div>

        <div className="mt-2 relative z-10">
          <div className="text-2xl font-black text-emerald-900 tabular-nums tracking-tight">
            {formatCurrency(igv)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium">
            <span>Impuesto General a las Ventas</span>
            <span className="font-bold text-emerald-800">Tasa oficial 18%</span>
          </div>
        </div>
      </div>

      {/* Grid de Base Imponible & Total */}
      <div className="space-y-2 text-xs">
        
        {/* Base Gravada */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            <div>
              <span className="text-slate-700 text-[11px] font-bold block leading-tight">
                Base Imponible (Gravado)
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                Ventas afectas al 18%
              </span>
            </div>
          </div>
          <span className="font-black text-slate-900 tabular-nums text-xs">
            {formatCurrency(taxed)}
          </span>
        </div>

        {/* Exonerado si existiera */}
        {exonerated > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/70">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-amber-900 text-[11px] font-bold">
                Exonerado / Inafecto
              </span>
            </div>
            <span className="font-black text-amber-900 tabular-nums text-xs">
              {formatCurrency(exonerated)}
            </span>
          </div>
        )}

        {/* Total Neto Consolidado */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xs border border-slate-700/60">
          <div className="flex items-center gap-2">
            <Scale size={13} className="text-emerald-400 shrink-0" />
            <span className="text-slate-200 text-[11px] font-bold">
              Total Facturado SUNAT
            </span>
          </div>
          <span className="font-black tabular-nums text-emerald-400 text-sm">
            {formatCurrency(total)}
          </span>
        </div>

      </div>

      {/* Barra de Proporción Fiscal */}
      <div className="mt-3 pt-2.5 border-t border-slate-100">
        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Base: {taxedPercent.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            IGV: {igvPercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 p-0.5 overflow-hidden flex gap-0.5">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-l-full transition-all duration-500 shadow-2xs" 
            style={{ width: `${taxedPercent}%` }} 
          />
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-r-full transition-all duration-500 shadow-2xs" 
            style={{ width: `${igvPercent}%` }} 
          />
        </div>
      </div>

    </div>
  );
};
