import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useCompanyBranches } from '../../hooks/useCompany';
import { CustomSelect } from '../ui/CustomSelect';

export const BranchSelector: React.FC = () => {
  const { branch, setBranch } = useFilters();
  const { data: branches } = useCompanyBranches();  const options = useMemo(() => {
    return (branches || []).map((b: { id: string; name: string }) => ({
      value: b.id,
      label: b.name
    }));
  }, [branches]);

  return (
    <CustomSelect
      value={branch}
      onChange={setBranch}
      options={options}
      placeholder="Todas las sedes"
      icon={<MapPin size={15} />}
    />
  );
};
