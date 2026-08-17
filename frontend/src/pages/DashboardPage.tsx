import React, { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useFilters } from '../hooks/useFilters';
import { useAuthStore } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { companyService } from '../services/api';
import { GlobalFilters } from '../components/filters/GlobalFilters';
import { useHeaderStore } from '../hooks/useHeader';

export const DashboardPage: React.FC = () => {
  const { companyId, dateStart, dateEnd } = useFilters();
  const token = useAuthStore((state) => state.accessToken);

  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!companyId) return;
    setIsSyncing(true);
    try {
      await companyService.sync(companyId);
      queryClient.invalidateQueries();
    } catch (err) {
      console.error("Error triggering sync:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    if (!companyId) return;
    axios({
      url: `/api/reports/excel`,
      method: 'GET',
      params: { companyId, dateStart, dateEnd },
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` }
    }).then((response) => {
      const href = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = href;
      link.setAttribute('download', `reporte_ventas_${dateStart}_a_${dateEnd}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    }).catch(err => console.error("Error exporting report:", err));
  };

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const user = useAuthStore((state) => state.user);
  const userName = user?.name || "Empresa";

  useEffect(() => {
    setHeader(
      `Buenos días, ${userName}`,
      today,
      <>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 py-1 px-2 bg-white border border-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-semibold rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
        <button 
          onClick={handleExport}
          className="inline-flex items-center gap-1 py-1 px-2.5 bg-slate-900 text-white text-[10px] sm:text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <Download className="w-3 h-3" />
          Exportar
        </button>
      </>
    );
    return () => clearHeader();
  }, [userName, today, isSyncing, companyId, dateStart, dateEnd, token]);

  return (
    <div className="space-y-6">

      {/* Barra de Filtros Globales */}
      <div className="mb-6 animate-in fade-in duration-500">
        <GlobalFilters />
      </div>

      {/* Contenido del Dashboard — pendiente de rediseño */}

    </div>
  );
};
