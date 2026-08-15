import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Building2, 
  LineChart, 
  ArrowLeftRight, 
  Target, 
  Bell, 
  Lightbulb, 
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuth';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
}

const navGroups = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Ventas', path: '/sales', icon: ShoppingCart },
      { name: 'Vendedores', path: '/sellers', icon: Users },
      { name: 'Empresas', path: '/companies', icon: Building2 },
    ]
  },
  {
    label: 'Análisis',
    items: [
      { name: 'Análisis Temporal', path: '/temporal', icon: LineChart },
      { name: 'Comparador', path: '/comparator', icon: ArrowLeftRight },
      { name: 'Metas', path: '/goals', icon: Target },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { name: 'Alertas', path: '/alerts', icon: Bell, badge: true },
      { name: 'Insights', path: '/insights', icon: Lightbulb },
      { name: 'Reportes', path: '/reports', icon: FileText },
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/5 z-50 transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? 'w-[72px]' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-primary">
                <span className="text-white font-bold text-lg leading-none">S</span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Syscom<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">Pro</span>
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-primary">
                <span className="text-white font-bold text-lg leading-none">S</span>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {navGroups.map((group, idx) => (
            <div key={idx} className="px-3">
              {!isCollapsed && (
                <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={handleNavClick}
                        className={`group flex items-center relative rounded-lg px-3 py-2 transition-all duration-200
                          ${isActive 
                            ? 'bg-white/10 text-white' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }
                          ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}
                        `}
                        title={isCollapsed ? item.name : undefined}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-400 rounded-r-full shadow-glow-primary" />
                        )}
                        <item.icon size={20} className={`shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                        
                        {!isCollapsed && (
                          <span className="font-medium whitespace-nowrap overflow-hidden text-sm flex-1">
                            {item.name}
                          </span>
                        )}

                        {item.badge && !isCollapsed && (
                          <span className="flex w-5 h-5 items-center justify-center rounded-full bg-danger-500 text-white text-[10px] font-bold shadow-glow-danger shrink-0">
                            3
                          </span>
                        )}
                        {item.badge && isCollapsed && (
                          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-danger-500 shadow-glow-danger" />
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'hidden' : 'flex'}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-violet-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-white/10">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate">{user?.name || 'Usuario'}</span>
                <span className="text-xs text-slate-400 truncate">{user?.role || 'Admin'}</span>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className={`flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-danger-500/10 hover:text-danger-400 transition-colors
                ${isCollapsed ? 'w-full' : ''}
              `}
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
