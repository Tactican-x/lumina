import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CurrencyCode = 'KES' | 'USD';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    locale: 'en-KE',
    flag: '🇰🇪',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    flag: '🇺🇸',
  },
};

interface CurrencyState {
  currencyCode: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  getCurrency: () => CurrencyInfo;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currencyCode: 'KES', // Default to KES

      setCurrency: (code: CurrencyCode) => {
        set({ currencyCode: code });
      },

      getCurrency: () => {
        return CURRENCIES[get().currencyCode];
      },
    }),
    {
      name: 'currency-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper to get currency outside of React components
export function getCurrentCurrency(): CurrencyInfo {
  return CURRENCIES[useCurrencyStore.getState().currencyCode];
}

export function getCurrentCurrencyCode(): CurrencyCode {
  return useCurrencyStore.getState().currencyCode;
}