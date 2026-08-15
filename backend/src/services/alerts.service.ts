import { db } from '../config/database.js';
import { alerts } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface Alert {
  id: string;
  companyId: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  recommendation: string | null;
  relatedEntity: string | null;
  isRead: boolean;
  detectedAt: Date;
}

export async function generateAlerts(companyId: string): Promise<void> {
  // Aquí se pueden aplicar las reglas de alertas (ej. bajas ventas, etc.)
  // Ejemplo: crear alerta de comprobación
}

export async function getAlerts(companyId: string, unreadOnly: boolean): Promise<Alert[]> {
  let conditions = eq(alerts.companyId, companyId);
  if (unreadOnly) {
    conditions = and(conditions, eq(alerts.isRead, false)) as any;
  }
  
  return db.query.alerts.findMany({
    where: conditions,
    orderBy: (alerts, { desc }) => [desc(alerts.detectedAt)]
  }) as unknown as Alert[];
}

export async function markAsRead(alertId: string): Promise<void> {
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, alertId));
}
