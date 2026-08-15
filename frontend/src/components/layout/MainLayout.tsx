import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useAuthStore } from '../../hooks/useAuth';
import { useFilters } from '../../hooks/useFilters';

export const MainLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setCompany = useFilters((state) => state.setCompany);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    } catch (e) {
      console.warn('Failed to save sidebar state to localStorage:', e);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (user?.companyId) {
      setCompany(user.companyId);
    }
  }, [user, setCompany]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-200 selection:text-primary-900">
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div 
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out
          ${isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}
        `}
      >
        <Header setIsMobileOpen={setIsMobileOpen} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 w-full animate-fade-in">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
