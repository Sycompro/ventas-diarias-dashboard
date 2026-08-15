import { useQuery } from '@tanstack/react-query';
import { useFilters } from './useFilters';
import { Company } from '../types';
import { companyService } from '../services/api';

// Mock data for development
const mockCompanies: Company[] = [
  { id: '1', name: 'Sede Principal - Lima', ruc: '20123456789', subdomain: 'central', timezone: 'America/Lima', currencySymbol: 'S/.', isActive: true, createdAt: '2020-01-01' },
  { id: '2', name: 'Sede Sur - Arequipa', ruc: '20987654321', subdomain: 'sur', timezone: 'America/Lima', currencySymbol: 'S/.', isActive: true, createdAt: '2021-05-15' },
];

export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      try {
        const data = await companyService.getAll();
        if (data && data.length > 0) {
          // Map properties if needed (backend returns id, name, ruc, subdomain)
          return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            ruc: c.ruc,
            subdomain: c.subdomain,
            timezone: c.timezone || 'America/Lima',
            currencySymbol: c.currencySymbol || 'S/.',
            isActive: true,
            createdAt: new Date().toISOString()
          }));
        }
      } catch (err) {
        console.warn("Real database companies empty or offline, rendering default SEDES:", err);
      }
      return mockCompanies;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useActiveCompany = () => {
  const companyId = useFilters((state) => state.companyId);
  const { data: companies } = useCompanies();
  
  return companies?.find((c: any) => c.id === companyId) || null;
};

export const useCompanySellers = () => {
  const companyId = useFilters((state) => state.companyId);
  return useQuery({
    queryKey: ['company-sellers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        const data = await companyService.getSellers(companyId);
        return data || [];
      } catch (err) {
        console.error("Error fetching sellers list from api:", err);
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCompanyBranches = () => {
  const companyId = useFilters((state) => state.companyId);
  return useQuery({
    queryKey: ['company-branches', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        const data = await companyService.getBranches(companyId);
        return data || [];
      } catch (err) {
        console.error("Error fetching branches list from api:", err);
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
};
