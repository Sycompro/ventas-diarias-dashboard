import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface CustomDatePickerProps {
  dateStart: string;
  dateEnd: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS_ES = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

// Timezone-safe string to date parsing
const parseDateString = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Date to string formatting (yyyy-MM-dd)
const formatDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Date to UI formatting (dd/mm/yyyy)
const formatUIDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  dateStart,
  dateEnd,
  onChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Track navigated month/year
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    return dateStart ? parseDateString(dateStart) : new Date();
  });

  // Local selection state to allow range picking before applying
  const [tempStart, setTempStart] = useState<string | null>(dateStart || null);
  const [tempEnd, setTempEnd] = useState<string | null>(dateEnd || null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = useState(false);

  // Sync state when props change (e.g. from preset buttons)
  useEffect(() => {
    setTempStart(dateStart);
    setTempEnd(dateEnd);
    if (dateStart) {
      setCurrentMonth(parseDateString(dateStart));
    }
  }, [dateStart, dateEnd]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset temp selection to actual filter values if closed without finishing range
        setTempStart(dateStart);
        setTempEnd(dateEnd);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dateStart, dateEnd]);

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();

  // First day of month (0-6)
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
  // Days in month
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, monthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, monthIndex + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, monthIndex, day);
    const clickedDateStr = formatDateString(clickedDate);

    // Case 1: Starting new selection
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(clickedDateStr);
      setTempEnd(null);
    } 
    // Case 2: Selecting end date
    else {
      if (clickedDateStr < tempStart) {
        // If clicked date is before start date, make it the new start date
        setTempStart(clickedDateStr);
        setTempEnd(null);
      } else {
        setTempEnd(clickedDateStr);
        onChange(tempStart, clickedDateStr);
        setIsOpen(false);
      }
    }
  };

  const handleQuickAction = (preset: 'today' | 'yesterday' | 'this_month') => {
    const today = new Date();
    let startStr = '';
    let endStr = '';

    if (preset === 'today') {
      startStr = formatDateString(today);
      endStr = formatDateString(today);
    } else if (preset === 'yesterday') {
      const yesterday = subDays(today, 1);
      startStr = formatDateString(yesterday);
      endStr = formatDateString(yesterday);
    } else if (preset === 'this_month') {
      startStr = formatDateString(startOfMonth(today));
      endStr = formatDateString(endOfMonth(today));
    }

    setTempStart(startStr);
    setTempEnd(endStr);
    onChange(startStr, endStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    // Standard default is today or empty
    const todayStr = formatDateString(new Date());
    onChange(todayStr, todayStr);
    setIsOpen(false);
  };

  // Helper to determine day styling classes
  const getDayClasses = (day: number) => {
    const dayDate = new Date(year, monthIndex, day);
    const dayDateStr = formatDateString(dayDate);
    const todayStr = formatDateString(new Date());

    const isToday = dayDateStr === todayStr;
    const isStart = tempStart === dayDateStr;
    const isEnd = tempEnd === dayDateStr;

    let isInRange = false;
    let isHoverRange = false;

    // Check if within selected range
    if (tempStart && tempEnd && dayDateStr > tempStart && dayDateStr < tempEnd) {
      isInRange = true;
    }

    // Check if within hovered range during active pick
    if (tempStart && !tempEnd && hoveredDate && dayDateStr > tempStart && dayDateStr <= hoveredDate) {
      isHoverRange = true;
    }

    const baseClass = "h-8 w-8 flex items-center justify-center text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer";

    if (isStart && isEnd) {
      return `${baseClass} bg-primary-600 text-white ring-2 ring-primary-500/20`;
    }
    if (isStart) {
      return `${baseClass} bg-primary-600 text-white rounded-r-none rounded-l-lg`;
    }
    if (isEnd) {
      return `${baseClass} bg-primary-600 text-white rounded-l-none rounded-r-lg`;
    }
    if (isInRange) {
      return `${baseClass} bg-primary-50 text-primary-700 rounded-none hover:bg-primary-100/80`;
    }
    if (isHoverRange) {
      return `${baseClass} bg-primary-50/60 text-primary-600 rounded-none hover:bg-primary-100/60`;
    }
    if (isToday) {
      return `${baseClass} border border-primary-500 text-primary-600 hover:bg-slate-50`;
    }

    return `${baseClass} text-slate-700 hover:bg-slate-100`;
  };

  // Grid days generation
  const renderDays = () => {
    const cells = [];
    
    // Padding cells for first week offset
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Actual day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, monthIndex, day);
      const dayDateStr = formatDateString(dayDate);
      
      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleDayClick(day)}
          onMouseEnter={() => tempStart && !tempEnd && setHoveredDate(dayDateStr)}
          className={getDayClasses(day)}
        >
          {day}
        </button>
      );
    }

    return cells;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all text-left focus:outline-none focus:ring-2 cursor-pointer duration-200
          ${tempStart && tempEnd 
            ? 'bg-amber-50/90 border-amber-200 hover:bg-amber-100/80 text-amber-900 focus:ring-amber-100 focus:border-amber-400 font-bold' 
            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700 focus:ring-slate-100 focus:border-slate-300'
          } ${isOpen ? 'ring-2 ring-amber-100 border-amber-500' : ''}`}
      >
        <CalendarIcon size={14} className={`shrink-0 transition-colors ${tempStart && tempEnd ? 'text-amber-500' : 'text-slate-400'}`} />
        <span className="text-xs font-bold whitespace-nowrap">
          {tempStart && tempEnd 
            ? `${formatUIDate(tempStart)} a ${formatUIDate(tempEnd)}`
            : 'Seleccionar fechas'
          }
        </span>
      </button>

      {/* Popover Calendar Container */}
      {isOpen && (
        <div
          ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              const viewportWidth = window.innerWidth;
              if (rect.right > viewportWidth - 8 && !alignRight) {
                setAlignRight(true);
              } else if (rect.right <= viewportWidth - 8 && alignRight) {
                setAlignRight(false);
              }
            }
          }}
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} mt-1.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[290px] animate-in fade-in slide-in-from-top-1.5 duration-150`}
        >
          
          {/* Header Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <h4 className="text-xs font-bold text-slate-800 tracking-wide select-none">
              {MONTHS_ES[monthIndex]} {year}
            </h4>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays Names Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS_ES.map((day) => (
              <span key={day} className="text-[10px] font-bold text-slate-400 select-none tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setHoveredDate(null)}>
            {renderDays()}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 my-3" />

          {/* Quick actions and footer */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickAction('today')}
                className="text-[10px] font-bold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleQuickAction('this_month')}
                className="text-[10px] font-bold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                Este Mes
              </button>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              <X size={10} />
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
