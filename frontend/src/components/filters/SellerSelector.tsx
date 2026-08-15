import React, { useMemo } from 'react';
import { User } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useCompanySellers } from '../../hooks/useCompany';
import { CustomSelect } from '../ui/CustomSelect';

export const SellerSelector: React.FC = () => {
  const { seller, setSeller } = useFilters();
  const { data: sellers } = useCompanySellers();

  const options = useMemo(() => {
    return (sellers || []).map((s: string) => ({
      value: s,
      label: s
    }));
  }, [sellers]);

  return (
    <CustomSelect
      value={seller}
      onChange={setSeller}
      options={options}
      placeholder="Todos los usuarios"
      icon={<User size={15} />}
    />
  );
};
