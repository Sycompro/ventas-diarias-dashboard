import { create } from 'zustand';
import React from 'react';

interface HeaderStore {
  title: string;
  subtitle: React.ReactNode | null;
  actions: React.ReactNode | null;
  setHeader: (title: string, subtitle?: React.ReactNode | null, actions?: React.ReactNode | null) => void;
  clearHeader: () => void;
}

export const useHeaderStore = create<HeaderStore>((set) => ({
  title: 'SyscomPro',
  subtitle: null,
  actions: null,
  setHeader: (title, subtitle = null, actions = null) => set({ title, subtitle, actions }),
  clearHeader: () => set({ title: 'SyscomPro', subtitle: null, actions: null }),
}));
