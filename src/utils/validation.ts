/**
 * Validation utility functions
 */

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate time format (HH:MM)
export function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Validate that string is not empty
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

// Validate minimum length
export function hasMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength;
}

// Validate maximum length
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

// Validate number is in range
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Validate positive number
export function isPositive(value: number): boolean {
  return value > 0;
}

// Validate non-negative number
export function isNonNegative(value: number): boolean {
  return value >= 0;
}

// Validate date is in future
export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

// Validate date is in past
export function isPastDate(date: Date): boolean {
  return date.getTime() < Date.now();
}

// Habit validation
export interface HabitValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateHabit(data: {
  name?: string;
  reminderTime?: string;
}): HabitValidation {
  const errors: Record<string, string> = {};

  if (!data.name || !isNotEmpty(data.name)) {
    errors.name = 'Habit name is required';
  } else if (!hasMinLength(data.name, 2)) {
    errors.name = 'Habit name must be at least 2 characters';
  } else if (!hasMaxLength(data.name, 50)) {
    errors.name = 'Habit name must be less than 50 characters';
  }

  if (data.reminderTime && !isValidTime(data.reminderTime)) {
    errors.reminderTime = 'Invalid time format (use HH:MM)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Goal validation
export function validateGoal(data: {
  title?: string;
  targetValue?: number;
  targetDate?: Date;
}): HabitValidation {
  const errors: Record<string, string> = {};

  if (!data.title || !isNotEmpty(data.title)) {
    errors.title = 'Goal title is required';
  } else if (!hasMinLength(data.title, 3)) {
    errors.title = 'Goal title must be at least 3 characters';
  } else if (!hasMaxLength(data.title, 100)) {
    errors.title = 'Goal title must be less than 100 characters';
  }

  if (data.targetValue !== undefined && !isPositive(data.targetValue)) {
    errors.targetValue = 'Target value must be a positive number';
  }

  if (data.targetDate && !isFutureDate(data.targetDate)) {
    errors.targetDate = 'Target date must be in the future';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Task validation
export function validateTask(data: {
  title?: string;
  estimatedMinutes?: number;
}): HabitValidation {
  const errors: Record<string, string> = {};

  if (!data.title || !isNotEmpty(data.title)) {
    errors.title = 'Task title is required';
  } else if (!hasMaxLength(data.title, 200)) {
    errors.title = 'Task title must be less than 200 characters';
  }

  if (data.estimatedMinutes !== undefined) {
    if (!isPositive(data.estimatedMinutes)) {
      errors.estimatedMinutes = 'Estimated time must be positive';
    } else if (data.estimatedMinutes > 480) {
      errors.estimatedMinutes = 'Estimated time cannot exceed 8 hours';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
