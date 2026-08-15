import React from 'react';
import { Building2, Check } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useCompanies } from '../../hooks/useCompany';
import { Skeleton } from '../ui/Skeleton';

export const CompanySelector: React.FC = () => {
  const { companyId, setCompany } = useFilters();
  const { data: companies, isLoading } = useCompanies();

  if (isLoading) return <Skeleton className="h-10 w-64" />;

  return (
    <div className="relative group">
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors cursor-pointer duration-200 ${
        companyId 
          ? 'bg-primary-50/90 border-primary-200 hover:bg-primary-100/80 text-primary-900' 
          : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700'
      }`}>
        <Building2 size={15} className={`transition-colors shrink-0 ${companyId ? 'text-primary-500' : 'text-slate-400'}`} />
        <select
          value={companyId || ''}
          onChange={(e) => setCompany(e.target.value || null)}
          className="appearance-none bg-transparent text-xs font-bold focus:ring-0 pr-6 cursor-pointer outline-none w-full min-w-[180px] text-left"
        >
          <option value="">Todas las empresas (Consolidado)</option>
          {companies?.map((company: any) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${companyId ? 'text-primary-500' : 'text-slate-400'}`}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};
