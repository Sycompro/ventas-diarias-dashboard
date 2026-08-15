import React from 'react';
import { Bell, ShieldCheck } from 'lucide-react';
import { AlertBadge } from '../components/ui/AlertBadge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intelligenceService } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Query to fetch alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => intelligenceService.getAlerts()
  });

  // Mutation to mark alert as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => intelligenceService.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Bell className="text-primary" /> Alertas del Sistema
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Notificaciones y avisos automáticos detectados por el sistema inteligente.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100">
          <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No se detectaron anomalías ni alertas en el sistema.</p>
          <p className="text-xs text-slate-400 mt-1">Tu facturación se encuentra operando dentro de los rangos normales.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-500">
          {alerts.map((alert: any) => (
            <AlertBadge 
              key={alert.id}
              priority={alert.priority || 'low'}
              title={alert.title}
              description={alert.description}
              recommendation={alert.recommendation}
              timestamp={alert.detectedAt}
              onMarkRead={alert.isRead ? undefined : () => handleMarkAsRead(alert.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
