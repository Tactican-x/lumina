import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useUIStore, Theme as ThemeSetting } from '@/stores/uiStore';
import { darkColors, lightColors, type AppColors } from './palettes';

type ResolvedTheme = 'dark' | 'light';

export interface ThemeContextValue {
  mode: ResolvedTheme;
  colors: AppColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: darkColors,
});

function resolveTheme(setting: ThemeSetting, system: ResolvedTheme): ResolvedTheme {
  if (setting === 'system') return system;
  return setting;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const systemMode: ResolvedTheme = systemScheme === 'light' ? 'light' : 'dark';

  const themeSetting = useUIStore((s) => s.theme);
  const mode = resolveTheme(themeSetting, systemMode);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}