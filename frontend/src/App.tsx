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

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SalesPage = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const SalesBySellerPage = lazy(() => import('./pages/SalesBySellerPage').then(m => ({ default: m.SalesBySellerPage })));
const SalesByPaymentPage = lazy(() => import('./pages/SalesByPaymentPage').then(m => ({ default: m.SalesByPaymentPage })));
const SalesByDocumentPage = lazy(() => import('./pages/SalesByDocumentPage').then(m => ({ default: m.SalesByDocumentPage })));
const TemporalAnalysisPage = lazy(() => import('./pages/TemporalAnalysisPage').then(m => ({ default: m.TemporalAnalysisPage })));
const ComparatorPage = lazy(() => import('./pages/ComparatorPage').then(m => ({ default: m.ComparatorPage })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage').then(m => ({ default: m.CompaniesPage })));
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
              <Route path="ventas/productos" element={<Placeholder title="Ventas por Producto" />} />
              <Route path="ventas/empresas" element={<Placeholder title="Ventas por Empresa" />} />
              
              <Route path="analisis" element={<TemporalAnalysisPage />} />
              <Route path="comparador" element={<ComparatorPage />} />
              <Route path="metas" element={<GoalsPage />} />
              <Route path="alertas" element={<AlertsPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="reportes" element={<Placeholder title="Reportes" />} />
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
