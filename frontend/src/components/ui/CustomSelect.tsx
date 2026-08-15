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
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  icon,
  className = ''
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

  return (
    <div ref={containerRef} className={`relative min-w-[160px] ${className}`}>
      {/* Clickable button/trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200/80 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          <span className="text-xs font-semibold text-slate-700 truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1.5 duration-100">
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
