import { useQuery } from '@tanstack/react-query';
import { useFilters } from './useFilters';
import { DashboardMetrics, TrendPoint } from '../types';

// Mock data generator for development
const generateMockMetrics = (): DashboardMetrics => ({
  totalSales: Math.floor(Math.random() * 50000) + 10000,
  totalDocuments: Math.floor(Math.random() * 500) + 50,
  avgTicket: Math.floor(Math.random() * 200) + 50,
  byDocumentType: {
    facturas: { count: 120, amount: 25000 },
    boletas: { count: 350, amount: 15000 },
    notasCredito: { count: 10, amount: -1500 },
  },
  byPaymentMethod: {
    efectivo: { count: 200, amount: 10000 },
    tarjeta: { count: 150, amount: 18000 },
    transferencia: { count: 80, amount: 12000 },
    yapePlin: { count: 50, amount: 2500 },
    otros: { count: 0, amount: 0 },
  },
  topProducts: [
    { name: 'Laptop Pro X', quantity: 15, total: 45000, category: 'Electrónica' },
    { name: 'Monitor 27"', quantity: 30, total: 15000, category: 'Electrónica' },
    { name: 'Teclado Mecánico', quantity: 50, total: 5000, category: 'Accesorios' },
    { name: 'Mouse Inalámbrico', quantity: 80, total: 3200, category: 'Accesorios' },
    { name: 'Silla Ergonómica', quantity: 12, total: 8400, category: 'Mobiliario' },
  ],
  byCategory: [
    { category: 'Electrónica', total: 60000, count: 45 },
    { category: 'Mobiliario', total: 15000, count: 25 },
    { category: 'Accesorios', total: 12000, count: 150 },
  ],
  bySeller: [
    { sellerName: 'Ana García', total: 35000, count: 120, avgTicket: 291 },
    { sellerName: 'Carlos López', total: 28000, count: 95, avgTicket: 294 },
    { sellerName: 'María Rodríguez', total: 22000, count: 110, avgTicket: 200 },
    { sellerName: 'Juan Pérez', total: 15000, count: 65, avgTicket: 230 },
  ],
  comparison: {
    previousTotal: 38000,
    changePercent: 15.4,
    changeAmount: 5800,
    trend: 'up',
  },
});

const generateMockTrend = (): TrendPoint[] => {
  const data: TrendPoint[] = [];
  for (let i = 1; i <= 30; i++) {
    data.push({
      date: `2026-08-${i.toString().padStart(2, '0')}`,
      total: Math.floor(Math.random() * 5000) + 1000,
      count: Math.floor(Math.random() * 50) + 10,
      avgTicket: Math.floor(Math.random() * 150) + 50,
    });
  }
  return data;
};

const queryOptions = {
  staleTime: 3 * 60 * 1000, // 3 minutes
  refetchInterval: 5 * 60 * 1000, // 5 minutes
};

export const useDashboardMetrics = () => {
  const filters = useFilters();
  return useQuery({
    queryKey: ['sales-metrics', filters],
    queryFn: async () => {
      // In real app: return await salesService.getMetrics(filters);
      return new Promise<DashboardMetrics>((resolve) => 
        setTimeout(() => resolve(generateMockMetrics()), 800)
      );
    },
    ...queryOptions,
  });
};

export const useSalesTrend = () => {
  const filters = useFilters();
  return useQuery({
    queryKey: ['sales-trend', filters],
    queryFn: async () => {
      // In real app: return await salesService.getTrend(filters);
      return new Promise<TrendPoint[]>((resolve) => 
        setTimeout(() => resolve(generateMockTrend()), 600)
      );
    },
    ...queryOptions,
  });
};

// Similar hooks would be implemented for others
export const useSalesByPayment = () => {
  const filters = useFilters();
  return useQuery({
    queryKey: ['sales-by-payment', filters],
    queryFn: async () => {
      return new Promise<any>((resolve) => 
        setTimeout(() => resolve(generateMockMetrics().byPaymentMethod), 500)
      );
    },
    ...queryOptions,
  });
};

export const useSalesByDocumentType = () => {
  const filters = useFilters();
  return useQuery({
    queryKey: ['sales-by-document-type', filters],
    queryFn: async () => {
      return new Promise<any>((resolve) => 
        setTimeout(() => resolve(generateMockMetrics().byDocumentType), 500)
      );
    },
    ...queryOptions,
  });
};

export const useTopProducts = () => {
  const filters = useFilters();
  return useQuery({
    queryKey: ['sales-top-products', filters],
    queryFn: async () => {
      return new Promise<any>((resolve) => 
        setTimeout(() => resolve(generateMockMetrics().topProducts), 500)
      );
    },
    ...queryOptions,
  });
};

export const useSalesBySeller = () => {
  const filters = useFilters();
  return useQuery({
    queryKey: ['sales-by-seller', filters],
    queryFn: async () => {
      return new Promise<any>((resolve) => 
        setTimeout(() => resolve(generateMockMetrics().bySeller), 500)
      );
    },
    ...queryOptions,
  });
};

export const useDetailedPaymentMetrics = () => {
  const filters = useFilters();
  return useQuery({
    queryKey: ['sales-detailed-payments', filters],
    queryFn: async () => {
      // En producción esto llamaría a un endpoint del backend como /sales/by-payment-detailed
      const mockDetailed = [
        { id: '1', method: 'Tarjeta', company: 'Sede Principal - Lima', seller: 'Ana García', count: 45, amount: 8000 },
        { id: '2', method: 'Tarjeta', company: 'Sede Principal - Lima', seller: 'Carlos López', count: 32, amount: 6200 },
        { id: '3', method: 'Tarjeta', company: 'Sede Sur - Arequipa', seller: 'María Rodríguez', count: 28, amount: 3800 },
        { id: '4', method: 'Efectivo', company: 'Sede Principal - Lima', seller: 'Ana García', count: 70, amount: 3500 },
        { id: '5', method: 'Efectivo', company: 'Sede Principal - Lima', seller: 'Carlos López', count: 65, amount: 3200 },
        { id: '6', method: 'Efectivo', company: 'Sede Sur - Arequipa', seller: 'María Rodríguez', count: 65, amount: 3300 },
        { id: '7', method: 'Transferencia', company: 'Sede Principal - Lima', seller: 'Ana García', count: 25, amount: 5000 },
        { id: '8', method: 'Transferencia', company: 'Sede Principal - Lima', seller: 'Carlos López', count: 20, amount: 4000 },
        { id: '9', method: 'Transferencia', company: 'Sede Sur - Arequipa', seller: 'María Rodríguez', count: 35, amount: 3000 },
        { id: '10', method: 'Yape / Plin', company: 'Sede Principal - Lima', seller: 'Ana García', count: 20, amount: 1000 },
        { id: '11', method: 'Yape / Plin', company: 'Sede Principal - Lima', seller: 'Carlos López', count: 18, amount: 900 },
        { id: '12', method: 'Yape / Plin', company: 'Sede Sur - Arequipa', seller: 'María Rodríguez', count: 12, amount: 600 }
      ];
      return new Promise<any[]>((resolve) => 
        setTimeout(() => resolve(mockDetailed), 400)
      );
    },
    ...queryOptions,
  });
};
