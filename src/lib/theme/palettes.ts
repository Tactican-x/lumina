import { colors as darkColors } from '@/constants/theme';

export type AppColors = typeof darkColors;

export const lightColors: AppColors = {
  background: {
    primary: '#f6f7fb',
    secondary: '#ffffff',
    tertiary: '#f1f5f9',
    elevated: '#e5e7eb',
  },
  text: {
    primary: '#0a0a0f',
    secondary: '#374151',
    tertiary: '#6b7280',
    inverse: '#ffffff',
  },
  brand: darkColors.brand,
  success: darkColors.success,
  warning: darkColors.warning,
  danger: darkColors.danger,
  info: darkColors.info,
  purple: darkColors.purple,
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#cbd5e1',
  },
  gradients: darkColors.gradients,
};

export { darkColors };