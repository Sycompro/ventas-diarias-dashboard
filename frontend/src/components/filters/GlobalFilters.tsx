import React from 'react';
import { CompanySelector } from './CompanySelector';
import { BranchSelector } from './BranchSelector';
import { SellerSelector } from './SellerSelector';
import { GranularitySelector } from './GranularitySelector';
import { DateRangePicker } from './DateRangePicker';
import { useAuthStore } from '../../hooks/useAuth';

export const GlobalFilters: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isCompanyUser = !!user?.companyId;

  return (
    <div className="flex flex-wrap gap-3 items-center w-full">
      {!isCompanyUser && <CompanySelector />}
      <BranchSelector />
      <SellerSelector />
      <GranularitySelector />
      <DateRangePicker />
    </div>
  );
};
