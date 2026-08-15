import React from 'react';
import { Calendar } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { DATE_PRESETS } from '../../utils/constants';

export const DateRangePicker: React.FC = () => {
  const { dateStart, dateEnd, datePreset, setDatePreset, setDateRange } = useFilters();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-2  rounded-lg shadow-sm">
      <div className="flex items-center gap-2 px-2 ">
        <Calendar size={18} className="text-neutral-500" />
        <select
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value as any)}
          className="text-sm font-medium text-neutral-700 bg-transparent focus:ring-0 cursor-pointer outline-none"
        >
          {DATE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      
      <div className={`flex items-center gap-2 px-2 transition-opacity ${datePreset !== 'custom' ? 'opacity-50 pointer-events-none' : ''}`}>
        <input
          type="date"
          value={dateStart}
          onChange={(e) => setDateRange(e.target.value, dateEnd)}
          className="text-sm bg-neutral-50 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
        />
        <span className="text-neutral-400 text-sm">a</span>
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => setDateRange(dateStart, e.target.value)}
          className="text-sm bg-neutral-50 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
        />
      </div>
    </div>
  );
};
