import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  setIsMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setIsMobileOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard Principal';
    if (path.includes('sales')) return 'Ventas';
    if (path.includes('sellers')) return 'Vendedores';
    if (path.includes('companies')) return 'Empresas';
    if (path.includes('temporal')) return 'Análisis Temporal';
    if (path.includes('comparator')) return 'Comparador';
    if (path.includes('goals')) return 'Metas';
    if (path.includes('alerts')) return 'Alertas del Sistema';
    if (path.includes('insights')) return 'Insights Inteligentes';
    if (path.includes('reports')) return 'Reportes';
    return 'SyscomPro';
  };

  return (
    <header 
      className={`h-16 bg-white/80 backdrop-blur-md shadow-sm/80 backdrop-blur-md  -slate-200 sticky top-0 z-30 transition-all duration-200 flex items-center justify-between px-4 sm:px-6 lg:px-8
        ${scrolled ? 'shadow-sm' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{getPageTitle()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search - Hidden on small mobile */}
        <div className="hidden sm:flex items-center relative group">
          <Search size={18} className="absolute left-3 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 rounded-full text-sm focus:bg-white focus:-primary-300 focus:ring-2 focus:ring-primary-100 w-48 lg:w-64 transition-all duration-300 outline-none placeholder:text-slate-500"
          />
        </div>

        <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full  -white pulse-dot"></span>
        </button>

        <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

        <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-violet-500 flex items-center justify-center text-white shadow-sm">
            <User size={16} />
          </div>
        </button>
      </div>
    </header>
  );
};
