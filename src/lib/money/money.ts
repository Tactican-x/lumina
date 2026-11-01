import { getCurrentCurrency, getCurrentCurrencyCode, type CurrencyCode, CURRENCIES } from '@/stores/currencyStore';

export function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthKeyToDate(monthKey: string): Date {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1);
}

export function addMonthsToMonthKey(monthKey: string, deltaMonths: number): string {
  const d = monthKeyToDate(monthKey);
  d.setMonth(d.getMonth() + deltaMonths);
  return monthKeyFromDate(d);
}

export function formatMonthLabel(monthKey: string): string {
  const d = monthKeyToDate(monthKey);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function daysInMonth(monthKey: string): number {
  const d = monthKeyToDate(monthKey);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(date: Date): number {
  return date.getDate();
}

export function parseAmountToCents(input: string): number | null {
  const raw = (input ?? '').trim().replace(/,/g, '');
  if (!raw) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(raw)) return null;

  const [whole, frac = ''] = raw.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isFinite(cents)) return null;
  return cents;
}

/**
 * Format cents to currency string using user's selected currency
 */
export function formatCents(cents: number, currencyCode?: CurrencyCode): string {
  const currency = currencyCode 
    ? CURRENCIES[currencyCode] 
    : getCurrentCurrency();
  
  const value = (cents ?? 0) / 100;
  
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback formatting
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value).toLocaleString(currency.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}${currency.symbol} ${abs}`;
  }
}

/**
 * Format amount without currency symbol (for inputs)
 */
export function formatAmountOnly(cents: number): string {
  const currency = getCurrentCurrency();
  const value = (cents ?? 0) / 100;
  return value.toLocaleString(currency.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Get current currency symbol
 */
export function getCurrencySymbol(): string {
  return getCurrentCurrency().symbol;
}

/**
 * Get current currency info
 */
export function getCurrencyInfo() {
  return getCurrentCurrency();
}

/**
 * Budget pace helper:
 * - expectedSpentByNow: linear pacing
 * - status: on_track | over | under
 * - dailyAllowanceCents: remaining / daysLeft (if daysLeft>0)
 */
export function getBudgetPace(params: {
  monthKey: string;
  budgetCents: number;
  spentCents: number;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const dim = daysInMonth(params.monthKey);

  const inSameMonth = monthKeyFromDate(now) === params.monthKey;
  const day = inSameMonth ? dayOfMonth(now) : 1;

  const expectedSpentByNow = Math.round((params.budgetCents * day) / dim);
  const delta = params.spentCents - expectedSpentByNow;

  const tolerance = Math.round(params.budgetCents * 0.03); // 3% tolerance
  const status = delta > tolerance ? 'over' : delta < -tolerance ? 'under' : 'on_track';

  // days left in month (if viewing current month); else treat as unknown
  let daysLeft = 0;
  if (inSameMonth) daysLeft = Math.max(0, dim - day);
  const dailyAllowanceCents =
    params.budgetCents > 0 && daysLeft > 0
      ? Math.floor(Math.max(0, params.budgetCents - params.spentCents) / daysLeft)
      : 0;

  return { expectedSpentByNow, delta, status, dailyAllowanceCents, day, daysInMonth: dim };
}