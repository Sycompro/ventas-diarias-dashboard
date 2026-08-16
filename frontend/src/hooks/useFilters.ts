import { create } from 'zustand';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from 'date-fns';
import { FilterState } from '../types';

interface FiltersStore extends FilterState {
  setCompany: (companyId: string | null) => void;
  setDateRange: (start: string, end: string) => void;
  setDatePreset: (preset: FilterState['datePreset']) => void;
  setBranch: (branch: string | null) => void;
  setSeller: (seller: string | null) => void;
  setGranularity: (granularity: FilterState['granularity']) => void;
}

const getDatesForPreset = (preset: FilterState['datePreset']) => {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return { start: format(yesterday, 'yyyy-MM-dd'), end: format(yesterday, 'yyyy-MM-dd') };
    case 'this_week':
      return { start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'last_week':
      const lastWeek = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
      return { start: format(lastWeek, 'yyyy-MM-dd'), end: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'this_month':
      return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
    case 'last_month':
      const lastMonth = subDays(startOfMonth(today), 1);
      return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
    case 'this_year':
      return { start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(endOfYear(today), 'yyyy-MM-dd') };
    case 'last_year':
      const lastYear = subDays(startOfYear(today), 1);
      return { start: format(startOfYear(lastYear), 'yyyy-MM-dd'), end: format(endOfYear(lastYear), 'yyyy-MM-dd') };
    default:
      return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
  }
};

const defaultDates = getDatesForPreset('today');

export const useFilters = create<FiltersStore>((set) => ({
  companyId: null,
  dateStart: defaultDates.start,
  dateEnd: defaultDates.end,
  datePreset: 'today',
  branch: null,
  seller: null,
  granularity: 'day',
  
  setCompany: (companyId) => set({ companyId, branch: null, seller: null }),
  setDateRange: (start, end) => set({ dateStart: start, dateEnd: end, datePreset: 'custom' }),
  setDatePreset: (preset) => {
    if (preset !== 'custom') {
      const dates = getDatesForPreset(preset);
      set({ datePreset: preset, dateStart: dates.start, dateEnd: dates.end });
    } else {
      set({ datePreset: preset });
    }
  },
  setBranch: (branch) => set({ branch, seller: null }),
  setSeller: (seller) => set({ seller }),
  setGranularity: (granularity) => set({ granularity }),
}));
