import React from 'react';
import { Calendar } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { DATE_PRESETS } from '../../utils/constants';
import { CustomSelect } from '../ui/CustomSelect';
import { CustomDatePicker } from '../ui/CustomDatePicker';

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
        <CustomDatePicker
          dateStart={dateStart}
          dateEnd={dateEnd}
          onChange={setDateRange}
        />
      )}
    </div>
  );
};
