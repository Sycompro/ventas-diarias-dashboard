import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatCurrency = (value: number, symbol: string = 'S/.'): string => {
  return `${symbol} ${value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatNumber = (value: number): string => {
  return value.toLocaleString('es-PE');
};

export const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'dd MMM yyyy', { locale: es });
  } catch (e) {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'dd MMM yyyy, HH:mm', { locale: es });
  } catch (e) {
    return dateString;
  }
};

export const formatTime = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'HH:mm', { locale: es });
  } catch (e) {
    return dateString;
  }
};
