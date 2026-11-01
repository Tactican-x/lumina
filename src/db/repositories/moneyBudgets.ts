import { asc, eq } from 'drizzle-orm';
import { db, generateId } from '../database';
import { moneyBudgets, type MoneyBudget } from '../schema';

export async function getMoneyBudgetForMonth(monthKey: string): Promise<MoneyBudget | null> {
  const rows = await db.select().from(moneyBudgets).where(eq(moneyBudgets.monthKey, monthKey)).limit(1);
  return rows[0] ?? null;
}

export async function getAllMoneyBudgets(): Promise<MoneyBudget[]> {
  return await db.select().from(moneyBudgets).orderBy(asc(moneyBudgets.monthKey));
}

export async function upsertMoneyBudgetForMonth(params: {
  monthKey: string;
  expenseBudgetCents: number;
  savingsGoalCents?: number;
}): Promise<MoneyBudget> {
  const existing = await getMoneyBudgetForMonth(params.monthKey);
  const now = new Date();

  if (!existing) {
    const id = generateId();
    await db.insert(moneyBudgets).values({
      id,
      monthKey: params.monthKey,
      expenseBudgetCents: Math.max(0, Math.round(params.expenseBudgetCents)),
      savingsGoalCents: Math.max(0, Math.round(params.savingsGoalCents ?? 0)),
      createdAt: now,
      updatedAt: now,
    });

    const created = await getMoneyBudgetForMonth(params.monthKey);
    if (!created) throw new Error('Failed to create budget');
    return created;
  }

  await db
    .update(moneyBudgets)
    .set({
      expenseBudgetCents: Math.max(0, Math.round(params.expenseBudgetCents)),
      savingsGoalCents: Math.max(0, Math.round(params.savingsGoalCents ?? existing.savingsGoalCents ?? 0)),
      updatedAt: now,
    })
    .where(eq(moneyBudgets.monthKey, params.monthKey));

  const updated = await getMoneyBudgetForMonth(params.monthKey);
  if (!updated) throw new Error('Failed to update budget');
  return updated;
}