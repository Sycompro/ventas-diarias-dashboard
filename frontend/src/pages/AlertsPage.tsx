import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { AlertBadge } from '../components/ui/AlertBadge';

const mockAlerts = [
  { id: '1', type: 'critical' as const, title: 'Caída de ventas inusual', description: 'Se ha detectado una caída del 45% en las ventas durante las últimas 4 horas comparado con el promedio.', recommendation: 'Revisar la operatividad del sistema de facturación y el estado de la conexión a internet en la tienda principal.', detectedAt: new Date().toISOString(), isRead: false },
  { id: '2', type: 'warning' as const, title: 'Vendedor debajo de meta', description: 'Ana García está un 30% por debajo de su meta semanal y faltan solo 2 días.', recommendation: 'Agendar reunión de seguimiento y revisar pipeline de prospectos.', detectedAt: new Date(Date.now() - 86400000).toISOString(), isRead: false },
  { id: '3', type: 'info' as const, title: 'Nueva empresa sincronizada', description: 'La empresa "Syscom Sur" ha finalizado su primera sincronización exitosamente.', detectedAt: new Date(Date.now() - 172800000).toISOString(), isRead: true },
];

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState(mockAlerts);

  const handleMarkAsRead = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Bell className="text-primary" /> Alertas del Sistema
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Notificaciones y avisos automáticos detectados por el sistema inteligente.</p>
      </div>

      <div className="space-y-4">
        {alerts.map(alert => (
          <AlertBadge key={alert.id} {...alert} onMarkAsRead={handleMarkAsRead} />
        ))}
      </div>
    </div>
  );
};
