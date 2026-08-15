import React from 'react';
import { Calendar } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { CustomSelect } from '../ui/CustomSelect';

export const GranularitySelector: React.FC = () => {
  const { granularity, setGranularity } = useFilters();

  const options = [
    { value: 'day', label: 'Vista por Día' },
    { value: 'month', label: 'Vista por Mes' },
    { value: 'year', label: 'Vista por Año' },
    { value: 'hour', label: 'Vista por Hora' }
  ];

  return (
    <CustomSelect
      value={granularity}
      onChange={(val) => setGranularity((val || 'day') as any)}
      options={options}
      placeholder="Vista por Día"
      icon={<Calendar size={15} />}
    />
  );
};
