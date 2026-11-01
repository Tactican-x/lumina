import { useCallback, useEffect, useState } from 'react';
import type { MoneyCategory } from '@/db/schema';
import * as catRepo from '@/db/repositories/moneyCategories';

export function useMoneyCategories() {
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await catRepo.ensureDefaultMoneyCategories();
      const list = await catRepo.getAllMoneyCategories();
      setCategories(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const create = useCallback(async (data: { name: string; emoji?: string; color?: string; kind: 'expense' | 'income' | 'both' }) => {
    await catRepo.createMoneyCategory(data);
    await refresh();
  }, [refresh]);

  const update = useCallback(async (id: string, patch: any) => {
    await catRepo.updateMoneyCategory(id, patch);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await catRepo.deleteMoneyCategoryAndReassign(id);
    await refresh();
  }, [refresh]);

  return { categories, isLoading, refresh, create, update, remove };
}