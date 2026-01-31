export * from './pearson';
export * from './regression';
export * from './probability';

// Additional statistical helpers

/**
 * Calculate descriptive statistics for an array
 */
export function descriptiveStats(values: number[]) {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      mode: null as number | null,
      min: 0,
      max: 0,
      range: 0,
      variance: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / count;

  // Median
  const mid = Math.floor(count / 2);
  const median = count % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  // Mode
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  let mode: number | null = null;
  for (const v of values) {
    frequency[v] = (frequency[v] || 0) + 1;
    if (frequency[v] > maxFreq) {
      maxFreq = frequency[v];
      mode = v;
    }
  }
  if (maxFreq === 1) mode = null;

  // Min, Max, Range
  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;

  // Variance and Standard Deviation
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((s, v) => s + v, 0) / count;
  const stdDev = Math.sqrt(variance);

  // Quartiles
  const q1Index = Math.floor(count * 0.25);
  const q3Index = Math.floor(count * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return {
    count,
    sum,
    mean,
    median,
    mode,
    min,
    max,
    range,
    variance,
    stdDev,
    q1,
    q3,
    iqr,
  };
}

/**
 * Detect outliers using IQR method
 */
export function detectOutliers(values: number[]): {
  outliers: number[];
  indices: number[];
  bounds: { lower: number; upper: number };
} {
  const stats = descriptiveStats(values);
  const lowerBound = stats.q1 - 1.5 * stats.iqr;
  const upperBound = stats.q3 + 1.5 * stats.iqr;

  const outliers: number[] = [];
  const indices: number[] = [];

  values.forEach((v, i) => {
    if (v < lowerBound || v > upperBound) {
      outliers.push(v);
      indices.push(i);
    }
  });

  return {
    outliers,
    indices,
    bounds: { lower: lowerBound, upper: upperBound },
  };
}

/**
 * Calculate percentile value
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p <= 0) return Math.min(...values);
  if (p >= 100) return Math.max(...values);

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate percentile rank of a value
 */
export function percentileRank(values: number[], value: number): number {
  const below = values.filter(v => v < value).length;
  const equal = values.filter(v => v === value).length;
  return ((below + 0.5 * equal) / values.length) * 100;
}

/**
 * Normalize values to 0-1 range
 */
export function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return values.map(() => 0.5);

  return values.map(v => (v - min) / range);
}

/**
 * Standardize values (z-score normalization)
 */
export function standardize(values: number[]): number[] {
  const stats = descriptiveStats(values);

  if (stats.stdDev === 0) return values.map(() => 0);

  return values.map(v => (v - stats.mean) / stats.stdDev);
}
