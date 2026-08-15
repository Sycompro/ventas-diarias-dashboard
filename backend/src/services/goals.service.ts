import { db, sqlClient } from '../config/database.js';
import { salesGoals } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface GoalProgress {
  goalId: string;
  sellerName: string | null;
  goalType: string;
  targetValue: number;
  currentValue: number;
  remaining: number;
  percentage: number;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
}

export async function getGoalProgress(companyId: string, date: string): Promise<GoalProgress[]> {
  const goals = await db.query.salesGoals.findMany({
    where: eq(salesGoals.companyId, companyId)
  });

  const progress: GoalProgress[] = [];

  for (const goal of goals) {
    if (!goal.isActive) continue;

    const salesRes = goal.sellerName
      ? await sqlClient`
          SELECT COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total
          FROM sales
          WHERE company_id = ${companyId} 
            AND issued_at::date >= ${goal.periodStart}::date 
            AND issued_at::date <= ${goal.periodEnd}::date
            AND status = 'active'
            AND seller_name = ${goal.sellerName}
        `
      : await sqlClient`
          SELECT COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total
          FROM sales
          WHERE company_id = ${companyId} 
            AND issued_at::date >= ${goal.periodStart}::date 
            AND issued_at::date <= ${goal.periodEnd}::date
            AND status = 'active'
        `;

    const currentValue = parseFloat(salesRes[0]?.total as string || '0');
    const targetValue = parseFloat(goal.targetValue as string);
    const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

    let status: GoalProgress['status'] = 'behind';
    if (percentage >= 100) status = 'achieved';
    else if (percentage >= 80) status = 'on_track';
    else if (percentage >= 50) status = 'at_risk';

    progress.push({
      goalId: goal.id,
      sellerName: goal.sellerName,
      goalType: goal.goalType,
      targetValue,
      currentValue,
      remaining: Math.max(0, targetValue - currentValue),
      percentage: Math.round(percentage * 10) / 10,
      periodType: goal.periodType,
      periodStart: goal.periodStart,
      periodEnd: goal.periodEnd,
      status,
    });
  }

  return progress;
}

export async function createGoal(data: typeof salesGoals.$inferInsert) {
  return db.insert(salesGoals).values(data).returning();
}

export async function getGoals(companyId: string) {
  return db.query.salesGoals.findMany({
    where: eq(salesGoals.companyId, companyId)
  });
}

export async function updateGoal(id: string, data: Partial<typeof salesGoals.$inferInsert>) {
  return db.update(salesGoals).set(data).where(eq(salesGoals.id, id)).returning();
}

export async function deleteGoal(id: string) {
  return db.delete(salesGoals).where(eq(salesGoals.id, id));
}
