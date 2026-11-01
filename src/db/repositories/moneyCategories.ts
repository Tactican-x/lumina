import { asc, eq } from 'drizzle-orm';
import { db, generateId } from '../database';
import { moneyCategories, moneyTransactions, type MoneyCategory } from '../schema';

export type MoneyCategoryKind = 'expense' | 'income' | 'both';

const DEFAULTS: Array<{
  name: string;
  emoji: string;
  color: string;
  kind: MoneyCategoryKind;
  sortOrder: number;
}> = [
  // Expense
  { name: 'Food', emoji: '🍔', color: '#f59e0b', kind: 'expense', sortOrder: 10 },
  { name: 'Transport', emoji: '🚗', color: '#3b82f6', kind: 'expense', sortOrder: 20 },
  { name: 'Rent', emoji: '🏠', color: '#22c55e', kind: 'expense', sortOrder: 30 },
  { name: 'Utilities', emoji: '💡', color: '#a855f7', kind: 'expense', sortOrder: 40 },
  { name: 'Entertainment', emoji: '🎮', color: '#ec4899', kind: 'expense', sortOrder: 50 },
  { name: 'Shopping', emoji: '🛍️', color: '#ef4444', kind: 'expense', sortOrder: 60 },
  { name: 'Other', emoji: '🧾', color: '#64748b', kind: 'expense', sortOrder: 90 },

  // Income
  { name: 'Salary', emoji: '💼', color: '#22c55e', kind: 'income', sortOrder: 10 },
  { name: 'Freelance', emoji: '🧑‍💻', color: '#3b82f6', kind: 'income', sortOrder: 20 },
  { name: 'Gift', emoji: '🎁', color: '#a855f7', kind: 'income', sortOrder: 30 },
  { name: 'Other Income', emoji: '➕', color: '#64748b', kind: 'income', sortOrder: 90 },
];

function keyFor(kind: string, name: string) {
  return `${String(kind).trim().toLowerCase()}:${String(name).trim().toLowerCase()}`;
}

function pickKeep(cats: MoneyCategory[]): MoneyCategory {
  // Prefer system categories, then lowest sortOrder, then earliest createdAt
  const sorted = [...cats].sort((a, b) => {
    const sys = Number(b.isSystem) - Number(a.isSystem);
    if (sys !== 0) return sys;

    const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (so !== 0) return so;

    const aT = new Date(a.createdAt as any).getTime() || 0;
    const bT = new Date(b.createdAt as any).getTime() || 0;
    return aT - bT;
  });

  return sorted[0];
}

/**
 * One-time repair: merge duplicate categories (same kind+name),
 * reassign transactions, delete duplicates.
 */
export async function repairMoneyCategories(): Promise<{ removed: number }> {
  const all = await db.select().from(moneyCategories);

  const groups = new Map<string, MoneyCategory[]>();
  for (const c of all) {
    const k = keyFor(c.kind, c.name);
    const arr = groups.get(k) ?? [];
    arr.push(c);
    groups.set(k, arr);
  }

  let removed = 0;

  for (const [, cats] of groups) {
    if (cats.length <= 1) continue;

    const keep = pickKeep(cats);
    const toRemove = cats.filter((c) => c.id !== keep.id);

    for (const rm of toRemove) {
      // Move transactions
      await db
        .update(moneyTransactions)
        .set({ categoryId: keep.id, updatedAt: new Date() })
        .where(eq(moneyTransactions.categoryId, rm.id));

      // Delete duplicate category
      await db.delete(moneyCategories).where(eq(moneyCategories.id, rm.id));
      removed += 1;
    }
  }

  return { removed };
}

async function ensureDefaultCategory(def: (typeof DEFAULTS)[number]) {
  // Find case-insensitively in JS (SQLite table not using NOCASE collation)
  const existing = await db
    .select()
    .from(moneyCategories)
    .where(eq(moneyCategories.kind, def.kind))
    .orderBy(asc(moneyCategories.sortOrder));

  const found = existing.find((c) => c.name.trim().toLowerCase() === def.name.trim().toLowerCase());
  if (found) return;

  const now = new Date();
  await db.insert(moneyCategories).values({
    id: generateId(),
    name: def.name,
    emoji: def.emoji,
    color: def.color,
    kind: def.kind,
    isSystem: true,
    sortOrder: def.sortOrder,
    createdAt: now,
    updatedAt: now,
  });
}

export async function ensureDefaultMoneyCategories(): Promise<void> {
  // 1) repair existing duplicates (so UI stops showing repeats)
  try {
    await repairMoneyCategories();
  } catch {
    // ignore (non-fatal)
  }

  // 2) ensure each default exists (don't bulk insert)
  for (const def of DEFAULTS) {
    await ensureDefaultCategory(def);
  }
}

/**
 * Get all categories (sorted and deduplicated)
 */
export async function getAllMoneyCategories(): Promise<MoneyCategory[]> {
  // Return sorted + (extra safety) deduped by kind+name
  const rows = await db
    .select()
    .from(moneyCategories)
    .orderBy(asc(moneyCategories.kind), asc(moneyCategories.sortOrder), asc(moneyCategories.name));

  const seen = new Set<string>();
  const out: MoneyCategory[] = [];

  for (const c of rows) {
    const k = keyFor(c.kind, c.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }

  return out;
}

/**
 * Get a single category by ID
 */
export async function getMoneyCategoryById(id: string): Promise<MoneyCategory | null> {
  const rows = await db.select().from(moneyCategories).where(eq(moneyCategories.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Get categories by kind (expense, income, or both)
 */
export async function getMoneyCategoriesByKind(kind: MoneyCategoryKind): Promise<MoneyCategory[]> {
  const rows = await db
    .select()
    .from(moneyCategories)
    .where(eq(moneyCategories.kind, kind))
    .orderBy(asc(moneyCategories.sortOrder), asc(moneyCategories.name));

  return rows;
}

export async function createMoneyCategory(data: {
  name: string;
  emoji?: string;
  color?: string;
  kind: MoneyCategoryKind;
}): Promise<MoneyCategory> {
  const name = data.name.trim();
  if (!name) throw new Error('Category name is required.');

  // Prevent duplicates (case-insensitive) within the same kind
  const existingSameKind = await db.select().from(moneyCategories).where(eq(moneyCategories.kind, data.kind));
  const dup = existingSameKind.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
  if (dup) throw new Error('That category already exists.');

  const id = generateId();
  const now = new Date();

  await db.insert(moneyCategories).values({
    id,
    name,
    emoji: (data.emoji ?? '').trim(),
    color: data.color ?? '#64748b',
    kind: data.kind,
    isSystem: false,
    sortOrder: 500,
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.select().from(moneyCategories).where(eq(moneyCategories.id, id)).limit(1);
  if (!created[0]) throw new Error('Failed to create category');
  return created[0];
}

export async function updateMoneyCategory(
  id: string,
  patch: Partial<Pick<MoneyCategory, 'name' | 'emoji' | 'color' | 'kind'>>
): Promise<void> {
  const nextName = patch.name?.trim();
  if (patch.name != null && !nextName) throw new Error('Category name is required.');

  // If renaming, prevent duplicates in target kind
  if (nextName) {
    const current = await db.select().from(moneyCategories).where(eq(moneyCategories.id, id)).limit(1);
    const currentRow = current[0];
    if (!currentRow) return;

    const targetKind = (patch.kind ?? currentRow.kind) as MoneyCategoryKind;
    const existingSameKind = await db.select().from(moneyCategories).where(eq(moneyCategories.kind, targetKind));
    const dup = existingSameKind.find(
      (c) => c.id !== id && c.name.trim().toLowerCase() === nextName.toLowerCase()
    );
    if (dup) throw new Error('That category already exists.');
  }

  await db
    .update(moneyCategories)
    .set({
      ...patch,
      ...(patch.name != null ? { name: nextName! } : null),
      updatedAt: new Date(),
    } as any)
    .where(eq(moneyCategories.id, id));
}

async function getFallbackCategoryId(kind: MoneyCategoryKind): Promise<string> {
  const fallbackName = kind === 'income' ? 'Other Income' : 'Other';

  const all = await db.select().from(moneyCategories).where(eq(moneyCategories.kind, kind));
  const found = all.find((c) => c.name.trim().toLowerCase() === fallbackName.trim().toLowerCase());

  if (found) return found.id;

  // If missing for some reason, ensure defaults and try again
  await ensureDefaultMoneyCategories();
  const all2 = await db.select().from(moneyCategories).where(eq(moneyCategories.kind, kind));
  const found2 = all2.find((c) => c.name.trim().toLowerCase() === fallbackName.trim().toLowerCase());
  if (!found2) throw new Error(`Missing fallback category: ${fallbackName}`);
  return found2.id;
}

export async function deleteMoneyCategoryAndReassign(categoryId: string): Promise<void> {
  const cat = await db.select().from(moneyCategories).where(eq(moneyCategories.id, categoryId)).limit(1);
  if (!cat[0]) return;

  if (cat[0].isSystem) throw new Error('System categories cannot be deleted.');

  const fallbackId = await getFallbackCategoryId(cat[0].kind as MoneyCategoryKind);

  await db
    .update(moneyTransactions)
    .set({ categoryId: fallbackId, updatedAt: new Date() })
    .where(eq(moneyTransactions.categoryId, categoryId));

  await db.delete(moneyCategories).where(eq(moneyCategories.id, categoryId));
}

/**
 * Get category statistics for export
 */
export async function getCategoryStats(): Promise<{
  total: number;
  expense: number;
  income: number;
  system: number;
  custom: number;
}> {
  const all = await getAllMoneyCategories();
  
  return {
    total: all.length,
    expense: all.filter((c) => c.kind === 'expense').length,
    income: all.filter((c) => c.kind === 'income').length,
    system: all.filter((c) => c.isSystem).length,
    custom: all.filter((c) => !c.isSystem).length,
  };
}