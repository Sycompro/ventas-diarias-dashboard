import React from 'react';
import { CompanySelector } from './CompanySelector';
import { BranchSelector } from './BranchSelector';
import { SellerSelector } from './SellerSelector';
import { DateRangePicker } from './DateRangePicker';
import { useAuthStore } from '../../hooks/useAuth';
import { Search } from 'lucide-react';

interface GlobalFiltersProps {
  actions?: React.ReactNode;
  showSellerFilter?: boolean;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export const GlobalFilters: React.FC<GlobalFiltersProps> = ({ 
  actions, 
  showSellerFilter = true, 
  showSearch = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...'
}) => {
  const user = useAuthStore((state) => state.user);
  const isCompanyUser = !!user?.companyId;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 items-center">
        {!isCompanyUser && <CompanySelector />}
        <BranchSelector />
        {showSellerFilter && <SellerSelector />}
        <DateRangePicker />
      </div>

      {/* Right side: search + extra actions */}
      <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
        {/* Search bar */}
        {showSearch && (
          <div className="relative flex items-center group w-full lg:w-48">
            <Search size={14} className="absolute left-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs w-full transition-all duration-200 outline-none placeholder:text-slate-400 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 font-semibold text-slate-700"
            />
          </div>
        )}

        {/* Slot for extra action buttons (e.g. Export) */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
