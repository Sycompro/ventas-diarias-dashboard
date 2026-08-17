import React from 'react';
import { Landmark, ReceiptText, Scale, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface TaxIgvCardProps {
  taxes?: {
    taxed: number;
    igv: number;
    exonerated: number;
    unaffected: number;
    total: number;
  };
  nonDeclaredAmount?: number;
  isLoading?: boolean;
}

export const TaxIgvCard: React.FC<TaxIgvCardProps> = ({ taxes, nonDeclaredAmount = 0, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="h-5 bg-slate-100 rounded-lg w-1/4"></div>
        <div className="h-10 bg-slate-100 rounded-lg flex-1"></div>
        <div className="h-10 bg-slate-100 rounded-lg flex-1"></div>
        <div className="h-10 bg-slate-100 rounded-lg flex-1"></div>
        <div className="h-10 bg-slate-100 rounded-lg flex-1"></div>
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 w-full flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:shadow-md animate-in fade-in duration-300">
      
      {/* Label / Badge Left */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-2.5 bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-xl shadow-xs">
          <Landmark size={15} />
        </div>
        <div>
          <h4 className="font-extrabold text-slate-800 text-xs tracking-tight flex items-center gap-1.5 leading-none">
            Desglose Tributario (IGV)
            <ShieldCheck size={12} className="text-emerald-500" />
          </h4>
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block mt-1.5 leading-none">
            SUNAT 18%
          </span>
        </div>
      </div>

      {/* Horizontal Divider for Mobile, Vertical for Desktop */}
      <div className="h-px w-full bg-slate-100 md:h-8 md:w-px shrink-0" />

      {/* Grid of 4 horizontal metrics */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Metric 1: Total Facturado */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/40 hover:bg-slate-50/50 transition-colors">
          <div className="p-1.5 bg-slate-800 text-white rounded-lg shrink-0">
            <Scale size={13} />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
              Total Facturado SUNAT
            </span>
            <span className="text-xs font-black text-slate-800 tabular-nums block mt-1.5 leading-tight">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Metric 2: Base Imponible */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/40 hover:bg-slate-50/50 transition-colors">
          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
            <ReceiptText size={13} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Base Imponible
              </span>
              <span className="px-1 py-0.2 bg-blue-50 text-blue-700 text-[8px] font-black rounded border border-blue-200">
                {taxedPercent.toFixed(0)}%
              </span>
            </div>
            <span className="text-xs font-black text-slate-800 tabular-nums block mt-1.5 leading-tight">
              {formatCurrency(taxed)}
            </span>
          </div>
        </div>

        {/* Metric 3: IGV Recaudado */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 hover:bg-emerald-50 transition-colors">
          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
            <Landmark size={13} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                Total IGV Recaudado
              </span>
              <span className="px-1 py-0.2 bg-emerald-100 text-emerald-900 text-[8px] font-black rounded border border-emerald-300">
                {igvPercent.toFixed(0)}%
              </span>
            </div>
            <span className="text-xs font-black text-emerald-900 tabular-nums block mt-1.5 leading-tight">
              {formatCurrency(igv)}
            </span>
          </div>
        </div>

        {/* Metric 4: Notas de Venta (No Declaradas) */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/40 border border-amber-100 hover:bg-amber-50/60 transition-colors">
          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <ReceiptText size={13} />
          </div>
          <div>
            <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block leading-none">
              No Declarado (Notas Venta)
            </span>
            <span className="text-xs font-black text-amber-900 tabular-nums block mt-1.5 leading-tight">
              {formatCurrency(nonDeclaredAmount)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
