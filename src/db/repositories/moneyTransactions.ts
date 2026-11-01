import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, generateId } from '../database';
import { moneyTransactions, type MoneyTransaction } from '../schema';
import { addMonthsToMonthKey, monthKeyFromDate } from '@/lib/money/money';

export async function createMoneyTransaction(params: {
  type: 'income' | 'expense';
  amountCents: number;
  categoryId: string;
  note?: string;
  occurredAt: Date;
}): Promise<MoneyTransaction> {
  const id = generateId();
  const now = new Date();
  const mk = monthKeyFromDate(params.occurredAt);

  await db.insert(moneyTransactions).values({
    id,
    type: params.type,
    amountCents: Math.max(0, Math.round(params.amountCents)),
    categoryId: params.categoryId,
    note: params.note?.trim() || null,
    occurredAt: params.occurredAt,
    monthKey: mk,
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.select().from(moneyTransactions).where(eq(moneyTransactions.id, id)).limit(1);
  if (!created[0]) throw new Error('Failed to create transaction');
  return created[0];
}

export async function getMoneyTransactionById(id: string): Promise<MoneyTransaction | null> {
  const rows = await db.select().from(moneyTransactions).where(eq(moneyTransactions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateMoneyTransaction(
  id: string,
  patch: Partial<Pick<MoneyTransaction, 'type' | 'amountCents' | 'categoryId' | 'note' | 'occurredAt'>>
): Promise<void> {
  const next: any = { ...patch, updatedAt: new Date() };

  if (patch.amountCents != null) next.amountCents = Math.max(0, Math.round(patch.amountCents));
  if (patch.note != null) next.note = patch.note?.trim() || null;

  if (patch.occurredAt) {
    next.monthKey = monthKeyFromDate(patch.occurredAt as any);
  }

  await db.update(moneyTransactions).set(next).where(eq(moneyTransactions.id, id));
}

export async function getMoneyTransactionsForMonth(monthKey: string): Promise<MoneyTransaction[]> {
  return await db
    .select()
    .from(moneyTransactions)
    .where(eq(moneyTransactions.monthKey, monthKey))
    .orderBy(desc(moneyTransactions.occurredAt), desc(moneyTransactions.createdAt));
}

export async function getAllMoneyTransactions(): Promise<MoneyTransaction[]> {
  return await db
    .select()
    .from(moneyTransactions)
    .orderBy(desc(moneyTransactions.occurredAt), desc(moneyTransactions.createdAt));
}

export async function getMoneyRecentTransactions(limit: number = 8): Promise<MoneyTransaction[]> {
  return await db.select().from(moneyTransactions).orderBy(desc(moneyTransactions.occurredAt)).limit(limit);
}

/**
 * ✅ NEW: Recent transactions for a specific month (used by month navigation dashboard)
 */
export async function getMoneyRecentTransactionsForMonth(
  monthKey: string,
  limit: number = 8
): Promise<MoneyTransaction[]> {
  return await db
    .select()
    .from(moneyTransactions)
    .where(eq(moneyTransactions.monthKey, monthKey))
    .orderBy(desc(moneyTransactions.occurredAt), desc(moneyTransactions.createdAt))
    .limit(limit);
}

export async function deleteMoneyTransaction(id: string): Promise<void> {
  await db.delete(moneyTransactions).where(eq(moneyTransactions.id, id));
}

export async function getMoneyMonthSummary(monthKey: string): Promise<{
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  txCount: number;
}> {
  const rows = await db
    .select({
      incomeCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${moneyTransactions.type} = 'income' THEN ${moneyTransactions.amountCents} ELSE 0 END), 0)`.as(
          'incomeCents'
        ),
      expenseCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${moneyTransactions.type} = 'expense' THEN ${moneyTransactions.amountCents} ELSE 0 END), 0)`.as(
          'expenseCents'
        ),
      txCount: sql<number>`COUNT(*)`.as('txCount'),
    })
    .from(moneyTransactions)
    .where(eq(moneyTransactions.monthKey, monthKey))
    .limit(1);

  const incomeCents = rows[0]?.incomeCents ?? 0;
  const expenseCents = rows[0]?.expenseCents ?? 0;
  const netCents = incomeCents - expenseCents;

  return { incomeCents, expenseCents, netCents, txCount: rows[0]?.txCount ?? 0 };
}

export async function getMoneyExpenseBreakdownByCategory(
  monthKey: string
): Promise<Array<{ categoryId: string; totalCents: number }>> {
  const rows = await db
    .select({
      categoryId: moneyTransactions.categoryId,
      totalCents: sql<number>`SUM(${moneyTransactions.amountCents})`.as('totalCents'),
    })
    .from(moneyTransactions)
    .where(and(eq(moneyTransactions.monthKey, monthKey), eq(moneyTransactions.type, 'expense')))
    .groupBy(moneyTransactions.categoryId)
    .orderBy(sql`totalCents DESC`);

  return rows.map((r) => ({ categoryId: r.categoryId, totalCents: r.totalCents ?? 0 }));
}

/**
 * Monthly comparison series (income vs expense) for last N months ending at endMonthKey.
 * Always returns exactly N points (missing months => 0s).
 */
export async function getMoneyMonthlySeries(params: { endMonthKey: string; months: number }) {
  const months = Math.max(1, Math.min(24, Math.round(params.months)));
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    keys.push(addMonthsToMonthKey(params.endMonthKey, -i));
  }

  const rows = await db
    .select({
      monthKey: moneyTransactions.monthKey,
      incomeCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${moneyTransactions.type} = 'income' THEN ${moneyTransactions.amountCents} ELSE 0 END), 0)`.as(
          'incomeCents'
        ),
      expenseCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${moneyTransactions.type} = 'expense' THEN ${moneyTransactions.amountCents} ELSE 0 END), 0)`.as(
          'expenseCents'
        ),
    })
    .from(moneyTransactions)
    .where(inArray(moneyTransactions.monthKey, keys))
    .groupBy(moneyTransactions.monthKey);

  const map = new Map(
    rows.map((r) => [
      r.monthKey,
      {
        incomeCents: r.incomeCents ?? 0,
        expenseCents: r.expenseCents ?? 0,
      },
    ])
  );

  return keys.map((k) => ({
    monthKey: k,
    incomeCents: map.get(k)?.incomeCents ?? 0,
    expenseCents: map.get(k)?.expenseCents ?? 0,
  }));
}

/**
 * ✅ Monthly totals for ALL months (for dashboards/exports).
 */
export async function getMoneyMonthlyTotals(): Promise<
  Array<{
    monthKey: string;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
    txCount: number;
  }>
> {
  const rows = await db
    .select({
      monthKey: moneyTransactions.monthKey,
      incomeCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${moneyTransactions.type} = 'income' THEN ${moneyTransactions.amountCents} ELSE 0 END), 0)`.as(
          'incomeCents'
        ),
      expenseCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${moneyTransactions.type} = 'expense' THEN ${moneyTransactions.amountCents} ELSE 0 END), 0)`.as(
          'expenseCents'
        ),
      txCount: sql<number>`COUNT(*)`.as('txCount'),
    })
    .from(moneyTransactions)
    .groupBy(moneyTransactions.monthKey)
    .orderBy(desc(moneyTransactions.monthKey));

  return rows.map((r) => {
    const incomeCents = r.incomeCents ?? 0;
    const expenseCents = r.expenseCents ?? 0;
    return {
      monthKey: r.monthKey,
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      txCount: r.txCount ?? 0,
    };
  });
}