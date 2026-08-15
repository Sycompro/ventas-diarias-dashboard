import React from 'react';
import { User } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useCompanySellers } from '../../hooks/useCompany';

export const SellerSelector: React.FC = () => {
  const { seller, setSeller } = useFilters();
  const { data: sellers, isLoading } = useCompanySellers();

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm transition-colors cursor-pointer">
        <User size={18} className="text-neutral-500" />
        <select
          value={seller || ''}
          onChange={(e) => setSeller(e.target.value || null)}
          className="appearance-none bg-transparent text-sm font-medium text-neutral-700 focus:ring-0 pr-6 cursor-pointer outline-none w-full min-w-[150px]"
          disabled={isLoading}
        >
          <option value="">Todos los usuarios</option>
          {sellers && sellers.map((s: string) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
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
