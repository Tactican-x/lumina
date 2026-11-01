import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoneyTransaction } from '@/db/schema';
import * as txRepo from '@/db/repositories/moneyTransactions';

export function useMoneyTransactions(monthKey: string) {
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Guards against stale async responses
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const reqId = ++requestIdRef.current;

    // Only the latest refresh should control loading state
    if (mountedRef.current) setIsLoading(true);

    try {
      const list = await txRepo.getMoneyTransactionsForMonth(monthKey);

      // Ignore stale results
      if (!mountedRef.current) return;
      if (reqId !== requestIdRef.current) return;

      setTransactions(list);
    } finally {
      if (!mountedRef.current) return;
      if (reqId !== requestIdRef.current) return;

      setIsLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    // When month changes, clear old list immediately to avoid “wrong month flash”
    setTransactions([]);
    refresh().catch(() => {});
  }, [refresh]);

  const create = useCallback(
    async (p: Parameters<typeof txRepo.createMoneyTransaction>[0]) => {
      const created = await txRepo.createMoneyTransaction(p);
      await refresh();
      return created;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, patch: Parameters<typeof txRepo.updateMoneyTransaction>[1]) => {
      await txRepo.updateMoneyTransaction(id, patch);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await txRepo.deleteMoneyTransaction(id);
      await refresh();
    },
    [refresh]
  );

  return { transactions, isLoading, refresh, create, update, remove };
}