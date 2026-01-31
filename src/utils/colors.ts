/**
 * Color utility functions
 */

// Convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Convert RGB to hex
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Lighten a color
export function lighten(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const amount = Math.round(255 * (percent / 100));

  return rgbToHex(
    Math.min(255, r + amount),
    Math.min(255, g + amount),
    Math.min(255, b + amount)
  );
}

// Darken a color
export function darken(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const amount = Math.round(255 * (percent / 100));

  return rgbToHex(
    Math.max(0, r - amount),
    Math.max(0, g - amount),
    Math.max(0, b - amount)
  );
}

// Get contrasting text color (black or white)
export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';

  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Generate color with opacity
export function withOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

// Predefined color palette for habits/goals
export const colorPalette = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
];

// Get random color from palette
export function getRandomColor(): string {
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
}

// Get color by index (cycling through palette)
export function getColorByIndex(index: number): string {
  return colorPalette[index % colorPalette.length];
}

// Get gradient for energy score
export function getEnergyGradient(score: number): [string, string] {
  if (score >= 80) return ['#10b981', '#059669']; // Green - Peak
  if (score >= 60) return ['#3b82f6', '#2563eb']; // Blue - Good
  if (score >= 40) return ['#f59e0b', '#d97706']; // Yellow - Moderate
  if (score >= 20) return ['#f97316', '#ea580c']; // Orange - Low
  return ['#ef4444', '#dc2626']; // Red - Very Low
}

// Get color for completion rate
export function getCompletionRateColor(rate: number): string {
  if (rate >= 80) return '#10b981'; // Green
  if (rate >= 60) return '#3b82f6'; // Blue
  if (rate >= 40) return '#f59e0b'; // Yellow
  if (rate >= 20) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

// Get color for correlation strength
export function getCorrelationColor(r: number): string {
  const absR = Math.abs(r);
  if (absR >= 0.8) return r > 0 ? '#10b981' : '#ef4444'; // Strong
  if (absR >= 0.5) return r > 0 ? '#3b82f6' : '#f97316'; // Moderate
  return '#6b7280'; // Weak
}

// Get color for risk level
export function getRiskColor(level: number): string {
  if (level >= 80) return '#ef4444'; // Critical - Red
  if (level >= 60) return '#f97316'; // High - Orange
  if (level >= 40) return '#f59e0b'; // Moderate - Yellow
  if (level >= 20) return '#3b82f6'; // Low - Blue
  return '#10b981'; // Minimal - Green
}
