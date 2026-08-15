import React from 'react';
import { X } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useCompanies } from '../../hooks/useCompany';
import { DATE_PRESETS } from '../../utils/constants';

export const FilterChips: React.FC = () => {
  const { companyId, datePreset, setCompany, setDatePreset } = useFilters();
  const { data: companies } = useCompanies();

  const activeCompany = companies?.find(c => c.id === companyId);
  const activePreset = DATE_PRESETS.find(p => p.value === datePreset);

  return (
    <div className="flex flex-wrap gap-2">
      {companyId && activeCompany && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-light text-primary-dark rounded-full text-xs font-medium">
          Empresa: {activeCompany.name}
          <button onClick={() => setCompany(null)} className="hover:text-primary transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
      {datePreset !== 'today' && activePreset && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-200 text-neutral-700 rounded-full text-xs font-medium">
          Fecha: {activePreset.label}
          <button onClick={() => setDatePreset('today')} className="hover:text-neutral-900 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
