// Re-export all types
export * from './habit';
export * from './goal';
export * from './task';
export * from './insight';
export * from './energy';

// Common utility types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SortOrder = 'asc' | 'desc';

export interface SortOptions<T> {
  field: keyof T;
  order: SortOrder;
}

// Statistics types
export interface CorrelationResult {
  coefficient: number; // Pearson's r
  pValue: number;
  confidence: number;
  significance: 'significant' | 'not_significant';
  sampleSize: number;
  interpretation: string;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  confidence: number;
  periodDays: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence: number; // Usually 95
}
