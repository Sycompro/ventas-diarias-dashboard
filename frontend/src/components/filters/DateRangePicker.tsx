import React from 'react';
import { Calendar } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { DATE_PRESETS } from '../../utils/constants';
import { CustomSelect } from '../ui/CustomSelect';

export const DateRangePicker: React.FC = () => {
  const { dateStart, dateEnd, datePreset, setDatePreset, setDateRange } = useFilters();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Selector de Rango Prestablecido */}
      <CustomSelect
        value={datePreset}
        onChange={(val) => setDatePreset((val || 'today') as any)}
        options={DATE_PRESETS}
        placeholder="Rango de Fechas"
        icon={<Calendar size={15} />}
      />

      {/* Rango de Fechas Personalizado (Manual) */}
      {datePreset === 'custom' && (
        <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-lg shadow-sm animate-in fade-in slide-in-from-left-1 duration-200">
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateRange(e.target.value, dateEnd)}
            className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
          />
          <span className="text-slate-400 text-[10px] font-bold uppercase">a</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateRange(dateStart, e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
