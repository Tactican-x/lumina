/**
 * Linear Regression and Trend Analysis
 */

export interface RegressionResult {
  slope: number;           // Rate of change
  intercept: number;       // Y-intercept
  rSquared: number;        // Coefficient of determination (0-1)
  standardError: number;   // Standard error of estimate
  prediction: (x: number) => number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  confidence: number;
  slope: number;
  description: string;
}

/**
 * Simple Linear Regression
 * y = mx + b
 */
export function linearRegression(
  x: number[],
  y: number[]
): RegressionResult {
  const n = x.length;

  if (n < 2) {
    return {
      slope: 0,
      intercept: y[0] || 0,
      rSquared: 0,
      standardError: 0,
      prediction: () => y[0] || 0,
    };
  }

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += (x[i] - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  // Calculate R-squared
  const predictions = x.map(xi => slope * xi + intercept);
  const ssRes = y.reduce((sum, yi, i) => sum + (yi - predictions[i]) ** 2, 0);
  const ssTot = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Calculate standard error
  const standardError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return {
    slope,
    intercept,
    rSquared,
    standardError,
    prediction: (xVal: number) => slope * xVal + intercept,
  };
}

/**
 * Analyze trend in data over time
 */
export function analyzeTrend(
  values: number[],
  periodDays: number = 7
): TrendAnalysis {
  if (values.length < 2) {
    return {
      direction: 'stable',
      changePercent: 0,
      confidence: 0,
      slope: 0,
      description: 'Insufficient data for trend analysis',
    };
  }

  // Create x values (0, 1, 2, ...)
  const x = values.map((_, i) => i);

  // Perform regression
  const regression = linearRegression(x, values);

  // Calculate percentage change
  const firstValue = regression.prediction(0);
  const lastValue = regression.prediction(values.length - 1);
  const changePercent = firstValue === 0 ? 0 : ((lastValue - firstValue) / Math.abs(firstValue)) * 100;

  // Determine direction with threshold
  const threshold = 5; // 5% change threshold
  let direction: 'up' | 'down' | 'stable';
  if (changePercent > threshold) direction = 'up';
  else if (changePercent < -threshold) direction = 'down';
  else direction = 'stable';

  // Confidence based on R-squared
  const confidence = Math.round(regression.rSquared * 100);

  // Generate description
  let description: string;
  if (direction === 'stable') {
    description = `Performance has been stable over the past ${periodDays} days`;
  } else {
    const dirWord = direction === 'up' ? 'improved' : 'declined';
    description = `Performance has ${dirWord} by ${Math.abs(changePercent).toFixed(1)}% over the past ${periodDays} days`;
  }

  return {
    direction,
    changePercent,
    confidence,
    slope: regression.slope,
    description,
  };
}

/**
 * Moving average calculation
 */
export function movingAverage(
  values: number[],
  windowSize: number
): number[] {
  if (values.length < windowSize) {
    return values;
  }

  const result: number[] = [];

  for (let i = 0; i <= values.length - windowSize; i++) {
    const window = values.slice(i, i + windowSize);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    result.push(avg);
  }

  return result;
}

/**
 * Exponential moving average
 * More recent values have higher weight
 */
export function exponentialMovingAverage(
  values: number[],
  smoothingFactor: number = 0.2
): number[] {
  if (values.length === 0) return [];

  const result: number[] = [values[0]];

  for (let i = 1; i < values.length; i++) {
    const ema = smoothingFactor * values[i] + (1 - smoothingFactor) * result[i - 1];
    result.push(ema);
  }

  return result;
}

/**
 * Detect peaks in data (local maxima)
 */
export function detectPeaks(
  values: number[],
  windowSize: number = 3
): number[] {
  const peaks: number[] = [];

  for (let i = windowSize; i < values.length - windowSize; i++) {
    const window = values.slice(i - windowSize, i + windowSize + 1);
    const center = values[i];

    // Check if center is the maximum in window
    if (center === Math.max(...window)) {
      peaks.push(i);
    }
  }

  return peaks;
}

/**
 * Detect troughs in data (local minima)
 */
export function detectTroughs(
  values: number[],
  windowSize: number = 3
): number[] {
  const troughs: number[] = [];

  for (let i = windowSize; i < values.length - windowSize; i++) {
    const window = values.slice(i - windowSize, i + windowSize + 1);
    const center = values[i];

    // Check if center is the minimum in window
    if (center === Math.min(...window)) {
      troughs.push(i);
    }
  }

  return troughs;
}

/**
 * Calculate rate of change (velocity)
 */
export function calculateVelocity(values: number[]): number[] {
  if (values.length < 2) return [];

  const velocities: number[] = [];

  for (let i = 1; i < values.length; i++) {
    velocities.push(values[i] - values[i - 1]);
  }

  return velocities;
}

/**
 * Calculate acceleration (change in velocity)
 */
export function calculateAcceleration(values: number[]): number[] {
  const velocity = calculateVelocity(values);
  return calculateVelocity(velocity);
}

/**
 * Project future value based on trend
 */
export function projectValue(
  values: number[],
  daysAhead: number
): { value: number; confidence: number } {
  const x = values.map((_, i) => i);
  const regression = linearRegression(x, values);

  const projectedValue = regression.prediction(values.length + daysAhead - 1);

  // Confidence decreases with projection distance
  const baseConfidence = regression.rSquared * 100;
  const decayFactor = Math.exp(-0.1 * daysAhead);
  const confidence = Math.round(baseConfidence * decayFactor);

  return {
    value: Math.max(0, projectedValue),
    confidence,
  };
}
