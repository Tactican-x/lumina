/**
 * Formatting utility functions
 */

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// Format correlation coefficient
export function formatCorrelation(r: number): string {
  const sign = r >= 0 ? '+' : '';
  return `r = ${sign}${r.toFixed(2)}`;
}

// Format p-value
export function formatPValue(p: number): string {
  if (p < 0.001) return 'p < 0.001';
  if (p < 0.01) return `p < 0.01`;
  if (p < 0.05) return `p < 0.05`;
  return `p = ${p.toFixed(3)}`;
}

// Format confidence interval
export function formatConfidenceInterval(lower: number, upper: number): string {
  return `[${lower.toFixed(2)}, ${upper.toFixed(2)}]`;
}

// Format streak number
export function formatStreak(count: number): string {
  if (count === 0) return 'No streak';
  if (count === 1) return '1 day';
  return `${count} days`;
}

// Format completion rate
export function formatCompletionRate(rate: number): string {
  return `${Math.round(rate)}% completion`;
}

// Pluralize word
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

// Format count with unit
export function formatCount(count: number, unit: string): string {
  return `${formatNumber(count)} ${pluralize(count, unit)}`;
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Capitalize first letter
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Convert to title case
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

// Format snake_case to Title Case
export function snakeToTitle(text: string): string {
  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Get ordinal suffix (1st, 2nd, 3rd, etc.)
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Format impact description based on correlation
export function formatImpactDescription(r: number, habitName: string): string {
  const absR = Math.abs(r);
  const direction = r >= 0 ? 'positively' : 'negatively';
  
  if (absR >= 0.8) {
    return `${habitName} very strongly ${direction} impacts your performance`;
  } else if (absR >= 0.6) {
    return `${habitName} strongly ${direction} impacts your performance`;
  } else if (absR >= 0.4) {
    return `${habitName} moderately ${direction} impacts your performance`;
  } else if (absR >= 0.2) {
    return `${habitName} slightly ${direction} impacts your performance`;
  } else {
    return `${habitName} has minimal impact on your performance`;
  }
}

// Format risk level
export function formatRiskLevel(level: number): string {
  if (level >= 80) return 'Critical';
  if (level >= 60) return 'High';
  if (level >= 40) return 'Moderate';
  if (level >= 20) return 'Low';
  return 'Minimal';
}

// Format momentum status
export function formatMomentum(status: string): string {
  const labels: Record<string, string> = {
    accelerating: '📈 Accelerating',
    steady: '➡️ Steady',
    slowing: '📉 Slowing',
    stalled: '⏸️ Stalled',
  };
  return labels[status] || status;
}
