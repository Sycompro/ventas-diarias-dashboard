import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { GlobalFilters } from '../filters/GlobalFilters';
import { useAuthStore } from '../../hooks/useAuth';

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-border-subtle flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold text-neutral-900 hidden sm:block">Dashboard Empresarial</h1>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <div className="hidden md:block">
          <GlobalFilters />
        </div>
        
        <div className="flex items-center gap-3 border-l border-border-subtle pl-4 lg:pl-6">
          <button className="relative p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-white"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm sm:hidden">
            {user?.name.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};
