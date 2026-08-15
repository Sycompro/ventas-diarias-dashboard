import React from 'react';
import { CompanySelector } from './CompanySelector';
import { BranchSelector } from './BranchSelector';
import { SellerSelector } from './SellerSelector';
import { GranularitySelector } from './GranularitySelector';
import { DateRangePicker } from './DateRangePicker';
import { useAuthStore } from '../../hooks/useAuth';
import { Search } from 'lucide-react';

export const GlobalFilters: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isCompanyUser = !!user?.companyId;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
      <div className="flex flex-wrap gap-3 items-center">
        {!isCompanyUser && <CompanySelector />}
        <BranchSelector />
        <SellerSelector />
        <GranularitySelector />
        <DateRangePicker />
      </div>
      
      {/* Buscador alineado en la misma fila */}
      <div className="relative flex items-center group w-full lg:w-60 shrink-0">
        <Search size={14} className="absolute left-3 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Buscar..." 
          className="pl-9 pr-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs w-full transition-all duration-300 outline-none placeholder:text-slate-400 focus:bg-white focus:border-slate-300 focus:ring-0 font-bold text-slate-700"
        />
      </div>
    </div>
  );
};
