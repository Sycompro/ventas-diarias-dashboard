import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { FilterChips } from '../filters/FilterChips';
import { GlobalFilters } from '../filters/GlobalFilters';
import { ToastContainer } from '../ui/Toast';

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300 pb-16 md:pb-0">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="md:hidden mb-4">
            <GlobalFilters />
          </div>
          <div className="mb-6">
            <FilterChips />
          </div>
          
          <div className="animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
      <ToastContainer />
    </div>
  );
};
