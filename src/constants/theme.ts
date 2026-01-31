export const colors = {
  // Background colors
  background: {
    primary: '#0a0a0f',
    secondary: '#111827',
    tertiary: '#1f2937',
    elevated: '#374151',
  },
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    tertiary: '#6b7280',
    inverse: '#0a0a0f',
  },
  
  // Brand colors
  brand: {
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
  },
  
  // Semantic colors
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  danger: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
  },
  
  // Purple (for creative/insights)
  purple: {
    main: '#a855f7',
    light: '#c084fc',
    dark: '#9333ea',
  },
  
  // Borders
  border: {
    light: '#374151',
    medium: '#4b5563',
    dark: '#1f2937',
  },
  
  // Gradients (as arrays for LinearGradient)
  gradients: {
    primary: ['#3b82f6', '#2563eb'],
    success: ['#10b981', '#059669'],
    warning: ['#f59e0b', '#d97706'],
    danger: ['#ef4444', '#dc2626'],
    purple: ['#a855f7', '#9333ea'],
    peakCognitive: ['#10b981', '#059669'],
    creativeFlow: ['#a855f7', '#ec4899'],
    analytical: ['#3b82f6', '#06b6d4'],
    recovery: ['#f59e0b', '#f97316'],
    social: ['#6366f1', '#a855f7'],
    rest: ['#6b7280', '#4b5563'],
  },
} as const;

export const typography = {
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font weights
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;
