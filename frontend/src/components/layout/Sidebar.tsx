import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Users, Building2, 
  Clock, GitCompare, Target, Bell, Lightbulb, 
  FileText, Settings, LogOut, ChevronRight, Menu
} from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuth';

export const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void }> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/ventas', icon: ShoppingCart, label: 'Ventas' },
    { to: '/ventas/vendedores', icon: Users, label: 'Vendedores' },
    { to: '/configuracion/empresas', icon: Building2, label: 'Empresas' },
    { to: '/analisis', icon: Clock, label: 'Análisis Temporal' },
    { to: '/comparador', icon: GitCompare, label: 'Comparador' },
    { to: '/metas', icon: Target, label: 'Metas' },
    { to: '/alertas', icon: Bell, label: 'Alertas', badge: 3 },
    { to: '/insights', icon: Lightbulb, label: 'Insights' },
    { to: '/reportes', icon: FileText, label: 'Reportes' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-border-subtle flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <LayoutDashboard className="text-primary" />
            <span>Syscom<span className="text-neutral-900">Pro</span></span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-primary-light text-primary-dark' 
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}
              `}
              end={item.to === '/' || item.to === '/ventas'}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer (User Info & Settings) */}
        <div className="p-4 border-t border-border-subtle">
          <NavLink
            to="/configuracion"
            end
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2
              ${isActive ? 'bg-primary-light text-primary-dark' : 'text-neutral-600 hover:bg-neutral-100'}
            `}
          >
            <Settings size={20} />
            <span>Configuración</span>
          </NavLink>
          
          <div className="flex items-center justify-between px-3 py-2 mt-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-sm font-semibold text-neutral-900 truncate">{user?.name}</span>
                <span className="text-xs text-neutral-500 truncate">{user?.role}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-neutral-400 hover:text-danger rounded-md hover:bg-danger-light transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
