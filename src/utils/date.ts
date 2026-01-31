/**
 * Date utility functions for Lumina
 */

// Format date to YYYY-MM-DD string
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get today's date key
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

// Get date from key
export function parseDateKey(key: string): Date {
  return new Date(key + 'T00:00:00');
}

// Format date for display
export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Format time for display
export function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format relative time (e.g., "2 hours ago", "in 3 days")
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isFuture = diffMs > 0;
  const abs = (n: number) => Math.abs(n);

  if (abs(diffDays) > 30) {
    return formatDisplayDate(date);
  } else if (abs(diffDays) >= 1) {
    const days = abs(diffDays);
    return isFuture ? `in ${days} day${days > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (abs(diffHours) >= 1) {
    const hours = abs(diffHours);
    return isFuture ? `in ${hours} hour${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (abs(diffMinutes) >= 1) {
    const minutes = abs(diffMinutes);
    return isFuture ? `in ${minutes} min` : `${minutes} min ago`;
  } else {
    return 'just now';
  }
}

// Check if date is today
export function isToday(date: Date): boolean {
  return formatDateKey(date) === getTodayKey();
}

// Check if date is yesterday
export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateKey(date) === formatDateKey(yesterday);
}

// Get start of day
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Get end of day
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

// Get start of week (Sunday)
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return startOfDay(result);
}

// Get end of week (Saturday)
export function endOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() + (6 - day));
  return endOfDay(result);
}

// Get array of dates between two dates
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// Get last N days
export function getLastNDays(n: number): Date[] {
  const dates: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(startOfDay(date));
  }
  return dates;
}

// Get days until date
export function daysUntil(date: Date): number {
  const now = startOfDay(new Date());
  const target = startOfDay(date);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Get days since date
export function daysSince(date: Date): number {
  return -daysUntil(date);
}

// Check if two dates are the same day
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateKey(date1) === formatDateKey(date2);
}

// Get current hour (0-23)
export function getCurrentHour(): number {
  return new Date().getHours();
}

// Get current day of week (0-6, Sunday = 0)
export function getCurrentDayOfWeek(): number {
  return new Date().getDay();
}

// Get greeting based on time of day
export function getTimeOfDayGreeting(): string {
  const hour = getCurrentHour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

// Format duration in minutes to readable string
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// Parse time string (HH:MM) to minutes since midnight
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format minutes since midnight to time string (HH:MM)
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
