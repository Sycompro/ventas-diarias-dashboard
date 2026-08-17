import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  title: string;
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  showSearch?: boolean;
}

export function DataTable<T>({ 
  title, 
  columns, 
  data, 
  isLoading, 
  emptyMessage = 'No hay datos disponibles',
  showSearch = true
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((item: any) => {
      return Object.values(item).some(
        (val) => val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);
  
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden flex flex-col">
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {showSearch && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-100/50">
            <tr className="bg-slate-50/80">
              {columns.map((col, idx) => (
                <th key={idx} className="py-3.5 px-5 text-xs uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700">
                    {col.header}
                    {col.sortable && <ChevronDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="even:bg-slate-50 hover:bg-slate-100/50 transition-colors">
                  <td colSpan={columns.length} className="py-4 px-5"><Skeleton variant="text" /></td>
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr className="even:bg-slate-50 hover:bg-slate-100/50 transition-colors">
                <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className="py-3.5 px-5 text-sm text-slate-700 whitespace-nowrap">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3.5 bg-slate-50/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">Mostrando {filteredData.length} registros</span>
        <div className="flex gap-1.5">
          <button className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Anterior
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
