import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MoneyCategory } from '@/db/schema';
import * as txRepo from '@/db/repositories/moneyTransactions';
import * as catRepo from '@/db/repositories/moneyCategories';
import * as budgetRepo from '@/db/repositories/moneyBudgets';

export function useMoneyDashboard(monthKey: string, opts?: { monthsBack?: number }) {
  const monthsBack = opts?.monthsBack ?? 6;

  const [summary, setSummary] = useState<{ incomeCents: number; expenseCents: number; netCents: number; txCount: number }>({
    incomeCents: 0,
    expenseCents: 0,
    netCents: 0,
    txCount: 0,
  });

  const [recent, setRecent] = useState<any[]>([]);
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [breakdown, setBreakdown] = useState<Array<{ categoryId: string; totalCents: number }>>([]);
  const [budget, setBudget] = useState<any | null>(null);
  const [monthlySeries, setMonthlySeries] = useState<Array<{ monthKey: string; incomeCents: number; expenseCents: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const defaultsEnsuredRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (mountedRef.current) setIsLoading(true);

    try {
      if (!defaultsEnsuredRef.current) {
        try {
          await catRepo.ensureDefaultMoneyCategories();
        } finally {
          defaultsEnsuredRef.current = true;
        }
      }

      const [s, r, cats, b, bd, series] = await Promise.all([
        txRepo.getMoneyMonthSummary(monthKey),

        // ✅ Month-based recent (instead of global)
        txRepo.getMoneyRecentTransactionsForMonth(monthKey, 8),

        catRepo.getAllMoneyCategories(),
        budgetRepo.getMoneyBudgetForMonth(monthKey),
        txRepo.getMoneyExpenseBreakdownByCategory(monthKey),
        txRepo.getMoneyMonthlySeries({ endMonthKey: monthKey, months: monthsBack }),
      ]);

      if (!mountedRef.current) return;
      if (reqId !== requestIdRef.current) return;

      setSummary(s);
      setRecent(r);
      setCategories(cats);
      setBudget(b);
      setBreakdown(bd);
      setMonthlySeries(series);
    } catch (error) {
      console.error('Error in useMoneyDashboard refresh:', error);
    } finally {
      if (!mountedRef.current) return;
      if (reqId !== requestIdRef.current) return;
      setIsLoading(false);
    }
  }, [monthKey, monthsBack]);

  useEffect(() => {
    // Clear month-specific state immediately (prevents “wrong month flash”)
    setSummary({ incomeCents: 0, expenseCents: 0, netCents: 0, txCount: 0 });
    setBreakdown([]);
    setBudget(null);
    setRecent([]);

    refresh().catch((error) => console.error('Error refreshing dashboard:', error));
  }, [refresh]);

  return { summary, recent, categories, breakdown, budget, monthlySeries, categoryById, isLoading, refresh };
}