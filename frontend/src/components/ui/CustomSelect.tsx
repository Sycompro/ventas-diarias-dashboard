import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: readonly Option[];
  placeholder: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'blue' | 'emerald' | 'violet' | 'amber' | 'primary';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  icon,
  className = '',
  variant
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const isActive = !!value;

  const variantMap: Record<string, { active: string; idle: string; iconActive: string; iconIdle: string }> = {
    blue:    { active: 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20',      idle: 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/60',    iconActive: 'text-white', iconIdle: 'text-blue-400' },
    emerald: { active: 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20', idle: 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60', iconActive: 'text-white', iconIdle: 'text-emerald-400' },
    violet:  { active: 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-500/20',   idle: 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50/60',  iconActive: 'text-white', iconIdle: 'text-violet-400' },
    amber:   { active: 'bg-amber-500 border-amber-400 text-white shadow-md shadow-amber-400/20',    idle: 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/60',   iconActive: 'text-white', iconIdle: 'text-amber-500' },
    primary: { active: 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20',  idle: 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60', iconActive: 'text-white', iconIdle: 'text-indigo-400' },
  };

  const scheme = variant ? variantMap[variant] : null;

  const triggerClass = scheme
    ? `${isActive ? scheme.active : scheme.idle} border rounded-xl transition-all duration-200 focus:outline-none`
    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 border rounded-xl transition-all duration-200 focus:outline-none';

  const iconClass = scheme
    ? (isActive ? scheme.iconActive : scheme.iconIdle)
    : 'text-slate-400';

  return (
    <div ref={containerRef} className={`relative min-w-[150px] ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left cursor-pointer ${triggerClass}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className={`shrink-0 transition-colors ${iconClass}`}>{icon}</span>
          )}
          <span className="text-xs font-bold truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${iconClass} ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Reset to default option */}
          <button
            type="button"
            onClick={() => { onChange(null); setIsOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left cursor-pointer rounded-lg transition-colors ${
              !value
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <span>{placeholder}</span>
            {!value && <Check size={12} className="text-slate-700" />}
          </button>

          {/* Options */}
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left cursor-pointer rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={12} className="text-slate-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
