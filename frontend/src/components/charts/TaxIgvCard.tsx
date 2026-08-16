import React from 'react';
import { Landmark, ReceiptText, Percent, ArrowUpRight } from 'lucide-react';
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
        <div className="h-5 bg-slate-100 rounded w-1/3"></div>
        <div className="h-20 bg-slate-100 rounded-xl"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/60 shadow-xs">
            <Landmark size={15} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-xs tracking-tight">
              Desglose Tributario (IGV 18%)
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Base imponible y recaudación SUNAT</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
          SUNAT 18%
        </span>
      </div>

      {/* IGV Hero Card */}
      <div className="my-3 p-3.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">
            Total IGV Recaudado
          </span>
          <div className="p-1 rounded-md bg-white/20 text-white">
            <Percent size={11} />
          </div>
        </div>
        <div className="mt-1">
          <div className="text-xl font-black tabular-nums tracking-tight">
            {formatCurrency(igv)}
          </div>
          <span className="text-[10px] text-emerald-100 font-medium mt-0.5 block">
            {igvPercent.toFixed(1)}% del total facturado
          </span>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-600 text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            Base Imponible (Gravado)
          </span>
          <span className="font-bold text-slate-900 tabular-nums">
            {formatCurrency(taxed)}
          </span>
        </div>

        {exonerated > 0 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600 text-[11px] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              Exonerado / Inafecto
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              {formatCurrency(exonerated)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 text-white">
          <span className="text-slate-300 text-[11px] font-bold">
            Total Neto Facturado
          </span>
          <span className="font-black tabular-nums text-emerald-400">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Progress Ratio Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100">
        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
          <span>Base: {taxedPercent.toFixed(0)}%</span>
          <span>IGV: {igvPercent.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
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
