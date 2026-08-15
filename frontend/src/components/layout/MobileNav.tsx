import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Bell, Menu } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Inicio' },
    { to: '/ventas', icon: ShoppingCart, label: 'Ventas' },
    { to: '/ventas/vendedores', icon: Users, label: 'Vends' },
    { to: '/alertas', icon: Bell, label: 'Alertas' },
    { to: '/reportes', icon: Menu, label: 'Más' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-subtle z-40 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors
              ${isActive ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900'}
            `}
            end={item.to === '/'}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};
