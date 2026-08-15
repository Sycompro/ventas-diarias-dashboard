import React from 'react';
import { MapPin } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

export const BranchSelector: React.FC = () => {
  const { branch, setBranch } = useFilters();

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm transition-colors cursor-pointer">
        <MapPin size={18} className="text-neutral-500" />
        <select
          value={branch || ''}
          onChange={(e) => setBranch(e.target.value || null)}
          className="appearance-none bg-transparent text-sm font-medium text-neutral-700 focus:ring-0 pr-6 cursor-pointer outline-none w-full min-w-[150px]"
        >
          <option value="">Todas las sedes</option>
          <option value="Sede Principal - Lima">Sede Principal - Lima</option>
          <option value="Sede Sur - Arequipa">Sede Sur - Arequipa</option>
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};
