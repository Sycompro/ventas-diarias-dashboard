export const PAYMENT_METHODS: Record<string, { name: string; color: string; icon: string }> = {
  '01': { name: 'Efectivo', color: '#10b981', icon: 'Banknotes' },
  '02': { name: 'Tarjeta', color: '#6366f1', icon: 'CreditCard' },
  '03': { name: 'Transferencia', color: '#3b82f6', icon: 'BuildingLibrary' },
  '05': { name: 'Yape/Plin', color: '#8b5cf6', icon: 'DevicePhoneMobile' },
  'default': { name: 'Otros', color: '#94a3b8', icon: 'Wallet' }
};

export const DOCUMENT_TYPES: Record<string, { name: string; shortName: string; color: string }> = {
  '01': { name: 'Factura', shortName: 'FA', color: '#3b82f6' },
  '03': { name: 'Boleta', shortName: 'BO', color: '#10b981' },
  '07': { name: 'Nota de Crédito', shortName: 'NC', color: '#ef4444' }
};

export const DATE_PRESETS = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'this_week', label: 'Esta Semana' },
  { value: 'last_week', label: 'Semana Anterior' },
  { value: 'this_month', label: 'Este Mes' },
  { value: 'last_month', label: 'Mes Anterior' },
  { value: 'this_year', label: 'Este Año' },
  { value: 'last_year', label: 'Año Anterior' },
  { value: 'custom', label: 'Personalizado' }
] as const;
