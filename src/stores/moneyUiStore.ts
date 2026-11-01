import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addMonthsToMonthKey, monthKeyFromDate } from '@/lib/money/money';

function isValidMonthKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
}

type MoneyUiState = {
  monthKey: string;
  setMonthKey: (monthKey: string) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  resetToCurrentMonth: () => void;
};

export const useMoneyUiStore = create<MoneyUiState>()(
  persist(
    (set) => ({
      monthKey: monthKeyFromDate(new Date()),

      setMonthKey: (monthKey) => {
        const current = monthKeyFromDate(new Date());
        const mk = isValidMonthKey(monthKey) ? monthKey : current;

        // ✅ prevent setting a future month
        set({ monthKey: mk > current ? current : mk });
      },

      prevMonth: () => set((s) => ({ monthKey: addMonthsToMonthKey(s.monthKey, -1) })),

      nextMonth: () =>
        set((s) => {
          const current = monthKeyFromDate(new Date());
          // ✅ don’t allow navigating into the future
          if (s.monthKey >= current) return { monthKey: s.monthKey };
          return { monthKey: addMonthsToMonthKey(s.monthKey, 1) };
        }),

      resetToCurrentMonth: () => set({ monthKey: monthKeyFromDate(new Date()) }),
    }),
    {
      name: 'money-ui-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ monthKey: state.monthKey }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const current = monthKeyFromDate(new Date());

        // Safety: invalid -> current
        if (!isValidMonthKey(state.monthKey)) {
          state.setMonthKey(current);
          return;
        }

        // Safety: future -> current
        if (state.monthKey > current) {
          state.setMonthKey(current);
        }
      },
    }
  )
);