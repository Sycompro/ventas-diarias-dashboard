import React from 'react';
import { GitCompare } from 'lucide-react';
import { ComparisonChart } from '../components/charts/ComparisonChart';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatPercent } from '../utils/formatters';

const tableData = [
  { metric: 'Ventas Totales', period1: 150000, period2: 135000, diff: 15000, percent: 11.1 },
  { metric: 'Documentos Emitidos', period1: 450, period2: 420, diff: 30, percent: 7.1 },
  { metric: 'Ticket Promedio', period1: 333, period2: 321, diff: 12, percent: 3.7 },
];

const columns = [
  { header: 'Métrica', key: 'metric' },
  { 
    header: 'Período Actual', 
    key: 'period1',
    render: (item: any) => <span className="font-medium text-neutral-900">{formatCurrency(item.period1)}</span>
  },
  { 
    header: 'Período Anterior', 
    key: 'period2',
    render: (item: any) => <span className="text-neutral-600">{formatCurrency(item.period2)}</span>
  },
  { 
    header: 'Diferencia', 
    key: 'diff',
    render: (item: any) => {
      const val = item.diff;
      return (
        <span className={`font-medium ${val > 0 ? 'text-success' : val < 0 ? 'text-danger' : 'text-neutral-600'}`}>
          {val > 0 ? '+' : ''}{formatCurrency(val)}
        </span>
      );
    }
  },
  { 
    header: 'Variación %', 
    key: 'percent',
    render: (item: any) => {
      const val = item.percent;
      return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${val > 0 ? 'bg-success-light text-success-dark' : val < 0 ? 'bg-danger-light text-danger-dark' : 'bg-neutral-100 text-neutral-600'}`}>
          {formatPercent(val)}
        </span>
      );
    }
  }
];

export const ComparatorPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <GitCompare className="text-primary" /> Comparador de Períodos
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Analice el rendimiento actual frente a períodos anteriores.</p>
      </div>

      <div className="card p-5">
        <ComparisonChart />
      </div>

      <div className="card">
        <div className="p-4  bg-neutral-50">
          <h3 className="font-semibold text-neutral-900">Detalle de Variaciones</h3>
        </div>
        <div className="p-4">
          <DataTable title="Detalle de Variaciones" columns={columns} data={tableData} />
        </div>
      </div>
    </div>
  );
};
