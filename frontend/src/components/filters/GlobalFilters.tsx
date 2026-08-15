import React from 'react';
import { CompanySelector } from './CompanySelector';
import { DateRangePicker } from './DateRangePicker';

export const GlobalFilters: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <CompanySelector />
      <DateRangePicker />
    </div>
  );
};
