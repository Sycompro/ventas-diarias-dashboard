import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './hooks/useAuth';
import { MainLayout } from './components/layout/MainLayout';
import { Skeleton } from './components/ui/Skeleton';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Helper to retry dynamic imports when a new deploy occurs and hashes change
const lazyWithRetry = (componentImport: () => Promise<any>) => {
  return lazy(async () => {
    try {
      const result = await componentImport();
      sessionStorage.removeItem('chunk_reload_attempts');
      return result;
    } catch (error) {
      console.error('Error loading chunk, forcing reload...', error);
      const hasReloaded = sessionStorage.getItem('chunk_reload_attempts');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_attempts', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
};

// Lazy load pages
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SalesPage = lazyWithRetry(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const SalesBySellerPage = lazyWithRetry(() => import('./pages/SalesBySellerPage').then(m => ({ default: m.SalesBySellerPage })));
const SalesByPaymentPage = lazyWithRetry(() => import('./pages/SalesByPaymentPage').then(m => ({ default: m.SalesByPaymentPage })));
const SalesByDocumentPage = lazyWithRetry(() => import('./pages/SalesByDocumentPage').then(m => ({ default: m.SalesByDocumentPage })));
const ComparatorPage = lazyWithRetry(() => import('./pages/ComparatorPage').then(m => ({ default: m.ComparatorPage })));
const GoalsPage = lazyWithRetry(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })));
const CompaniesPage = lazyWithRetry(() => import('./pages/CompaniesPage').then(m => ({ default: m.CompaniesPage })));
const ProductsPage = lazyWithRetry(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
// Placeholder components for routing
const Placeholder = ({ title }: { title: string }) => <div className="p-8 text-center text-xl text-neutral-500 font-medium">{title} - Próximamente</div>;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const LoadingFallback = () => (
  <div className="p-8 space-y-6">
    <Skeleton className="h-8 w-1/4" />
    <Skeleton variant="card" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="ventas" element={<SalesPage />} />
              <Route path="ventas/vendedores" element={<SalesBySellerPage />} />
              <Route path="ventas/pagos" element={<SalesByPaymentPage />} />
              <Route path="ventas/documentos" element={<SalesByDocumentPage />} />
              <Route path="ventas/productos" element={<ProductsPage />} />
              <Route path="ventas/empresas" element={<Placeholder title="Ventas por Empresa" />} />
              
              <Route path="comparador" element={<ComparatorPage />} />
              <Route path="metas" element={<GoalsPage />} />
              <Route path="configuracion/empresas" element={<CompaniesPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
