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

  // Close when clicking outside
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

  let variantClasses = '';
  let iconClasses = '';
  
  if (variant === 'blue') {
    variantClasses = value 
      ? 'bg-blue-50/90 border-blue-200 hover:bg-blue-100/80 text-blue-900 focus:ring-blue-100 focus:border-blue-400' 
      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700 focus:ring-slate-100 focus:border-slate-300';
    iconClasses = value ? 'text-blue-500' : 'text-slate-400';
  } else if (variant === 'emerald') {
    variantClasses = value 
      ? 'bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100/80 text-emerald-900 focus:ring-emerald-100 focus:border-emerald-400' 
      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700 focus:ring-slate-100 focus:border-slate-300';
    iconClasses = value ? 'text-emerald-500' : 'text-slate-400';
  } else if (variant === 'violet') {
    variantClasses = value 
      ? 'bg-violet-50/90 border-violet-200 hover:bg-violet-100/80 text-violet-900 focus:ring-violet-100 focus:border-violet-400' 
      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700 focus:ring-slate-100 focus:border-slate-300';
    iconClasses = value ? 'text-violet-500' : 'text-slate-400';
  } else if (variant === 'amber') {
    variantClasses = value 
      ? 'bg-amber-50/90 border-amber-200 hover:bg-amber-100/80 text-amber-900 focus:ring-amber-100 focus:border-amber-400' 
      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700 focus:ring-slate-100 focus:border-slate-300';
    iconClasses = value ? 'text-amber-500' : 'text-slate-400';
  } else if (variant === 'primary') {
    variantClasses = value 
      ? 'bg-primary-50/90 border-primary-200 hover:bg-primary-100/80 text-primary-900 focus:ring-primary-100 focus:border-primary-400' 
      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700 focus:ring-slate-100 focus:border-slate-300';
    iconClasses = value ? 'text-primary-500' : 'text-slate-400';
  } else {
    variantClasses = 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700 focus:ring-primary-100 focus:border-primary-500';
    iconClasses = 'text-slate-400';
  }

  return (
    <div ref={containerRef} className={`relative min-w-[160px] ${className}`}>
      {/* Clickable button/trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg transition-all text-left focus:outline-none focus:ring-2 cursor-pointer duration-200 ${variantClasses}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className={`shrink-0 transition-colors ${iconClasses}`}>{icon}</span>}
          <span className="text-xs font-bold truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${iconClasses} ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg z-50 max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1.5 duration-100">
          {/* Default Option (e.g. "Todos...") */}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer transition-colors
              ${!value 
                ? 'bg-primary-50/80 text-primary-700 font-bold' 
                : 'text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            <span>{placeholder}</span>
            {!value && <Check size={12} className="text-primary-600" />}
          </button>

          {/* Map options */}
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer transition-colors
                  ${isSelected 
                    ? 'bg-primary-50/80 text-primary-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={12} className="text-primary-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
