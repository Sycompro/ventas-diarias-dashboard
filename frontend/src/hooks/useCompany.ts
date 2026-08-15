import { useQuery } from '@tanstack/react-query';
import { useFilters } from './useFilters';
import { Company } from '../types';

// Mock data for development
const mockCompanies: Company[] = [
  { id: '1', name: 'Syscom Central', ruc: '20123456789', subdomain: 'central', timezone: 'America/Lima', currencySymbol: 'S/.', isActive: true, createdAt: '2020-01-01' },
  { id: '2', name: 'Syscom Norte', ruc: '20987654321', subdomain: 'norte', timezone: 'America/Lima', currencySymbol: 'S/.', isActive: true, createdAt: '2021-05-15' },
];

export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      // In real app: return await companyService.getAll();
      return new Promise<Company[]>((resolve) => setTimeout(() => resolve(mockCompanies), 500));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useActiveCompany = () => {
  const companyId = useFilters((state) => state.companyId);
  const { data: companies } = useCompanies();
  
  return companies?.find(c => c.id === companyId) || null;
};
