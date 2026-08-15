import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Bell, Menu } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const navItems = [
    { name: 'Inicio', path: '/', icon: LayoutDashboard },
    { name: 'Ventas', path: '/sales', icon: ShoppingCart },
    { name: 'Vendedores', path: '/sellers', icon: Users },
    { name: 'Alertas', path: '/alerts', icon: Bell, badge: true },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center w-full h-full gap-1
              ${isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 w-8 h-1 bg-primary-600 rounded-b-full shadow-glow-primary animate-slide-up" />
                )}
                <div className="relative mt-1">
                  <item.icon size={22} className={isActive ? 'stroke-[2.5px]' : ''} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
        
        <button className="relative flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 hover:text-slate-900">
          <div className="relative mt-1">
            <Menu size={22} />
          </div>
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </div>
    </div>
  );
};
