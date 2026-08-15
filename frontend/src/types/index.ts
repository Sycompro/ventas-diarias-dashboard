// Company
export interface Company {
  id: string;
  name: string;
  ruc: string;
  subdomain: string;
  timezone: string;
  currencySymbol: string;
  isActive: boolean;
  createdAt: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalSales: number;
  totalDocuments: number;
  avgTicket: number;
  byDocumentType: {
    facturas: { count: number; amount: number };
    boletas: { count: number; amount: number };
    notasCredito: { count: number; amount: number };
  };
  byPaymentMethod: {
    efectivo: { count: number; amount: number };
    tarjeta: { count: number; amount: number };
    transferencia: { count: number; amount: number };
    yapePlin: { count: number; amount: number };
    otros: { count: number; amount: number };
  };
  topProducts: Array<{ name: string; quantity: number; total: number; category: string }>;
  byCategory: Array<{ category: string; total: number; count: number }>;
  bySeller: Array<{ sellerName: string; total: number; count: number; avgTicket: number }>;
  comparison: {
    previousTotal: number;
    changePercent: number;
    changeAmount: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// Trend data point
export interface TrendPoint {
  date: string;
  total: number;
  count: number;
  avgTicket: number;
}

// Hourly data
export interface HourlyData {
  hour: number;
  total: number;
  count: number;
}

// Sale document
export interface SaleDocument {
  id: string;
  documentTypeId: string;
  series: string;
  number: string;
  total: number;
  sellerName: string;
  customerName: string;
  issuedAt: string;
  status: string;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface SaleItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export interface SalePayment {
  paymentMethodId: string;
  amount: number;
  reference: string;
}

// Goals
export interface Goal {
  id: string;
  companyId: string;
  sellerName: string | null;
  goalType: string;
  targetValue: number;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  isActive: boolean;
}

export interface GoalProgress {
  goal: Goal;
  current: number;
  remaining: number;
  percentage: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
}

// Alerts
export interface Alert {
  id: string;
  type: string;
  priority: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  relatedEntity: string;
  isRead: boolean;
  detectedAt: string;
}

// Insights
export interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  data: any;
  validForDate: string;
}

// Health status (traffic light)
export interface HealthStatus {
  sales: 'healthy' | 'attention' | 'critical';
  goals: 'healthy' | 'attention' | 'critical';
  trends: 'healthy' | 'attention' | 'critical';
  overall: 'healthy' | 'attention' | 'critical';
}

// Comparison result
export interface ComparisonResult {
  period1: { total: number; count: number; avgTicket: number };
  period2: { total: number; count: number; avgTicket: number };
  difference: { total: number; count: number; avgTicket: number };
  percentChange: { total: number; count: number; avgTicket: number };
}

// User auth
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  companyId?: string | null;
  companySubdomain?: string | null;
}

// Filter state
export interface FilterState {
  companyId: string | null;
  dateStart: string;
  dateEnd: string;
  datePreset: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';
  branch: string | null;
  seller: string | null;
  granularity: 'day' | 'month' | 'year' | 'hour';
}
