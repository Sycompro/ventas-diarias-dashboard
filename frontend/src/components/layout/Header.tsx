import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useHeaderStore } from '../../hooks/useHeader';

interface HeaderProps {
  setIsMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setIsMobileOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { title: storeTitle, subtitle: storeSubtitle, actions: storeActions } = useHeaderStore();

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

  const displayTitle = storeTitle !== 'SyscomPro' ? storeTitle : getPageTitle();

  return (
    <header 
      className="min-h-16 py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 transition-all duration-200 flex items-center justify-between px-4 sm:px-6 lg:px-8"
    >
      <div className="flex items-center gap-4 min-w-0">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug truncate">
            {displayTitle}
          </h1>
          {storeSubtitle && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium leading-none truncate">
              {storeSubtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Custom Actions (e.g. Sincronizar, Exportar) */}
        {storeActions && (
          <div className="flex items-center gap-1.5 sm:gap-2 mr-1 sm:mr-2">
            {storeActions}
          </div>
        )}

        {/* Search - Hidden on small mobile */}
        <div className="hidden md:flex items-center relative group">
          <Search size={16} className="absolute left-3 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 rounded-full text-xs focus:bg-white focus:ring-2 focus:ring-primary-100 w-36 lg:w-48 transition-all duration-300 outline-none placeholder:text-slate-500"
          />
        </div>

        <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full pulse-dot"></span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>

        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary-600 to-violet-500 flex items-center justify-center text-white">
            <User size={14} />
          </div>
        </button>
      </div>
    </header>
  );
};
