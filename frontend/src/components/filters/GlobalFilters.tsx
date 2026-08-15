import React from 'react';
import { CompanySelector } from './CompanySelector';
import { BranchSelector } from './BranchSelector';
import { SellerSelector } from './SellerSelector';
import { GranularitySelector } from './GranularitySelector';
import { DateRangePicker } from './DateRangePicker';

export const GlobalFilters: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-3 items-center w-full">
      <CompanySelector />
      <BranchSelector />
      <SellerSelector />
      <GranularitySelector />
      <DateRangePicker />
    </div>
  );
};
