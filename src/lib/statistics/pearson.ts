/**
 * Pearson Correlation Coefficient Calculator
 * 
 * The Pearson correlation coefficient (r) measures the linear relationship
 * between two variables. Values range from -1 to +1:
 * - +1: Perfect positive correlation
 * - 0: No correlation
 * - -1: Perfect negative correlation
 */

export interface CorrelationResult {
  coefficient: number;      // Pearson's r (-1 to 1)
  pValue: number;           // Statistical significance
  confidence: number;       // Confidence level (0-100)
  significance: 'significant' | 'not_significant';
  sampleSize: number;
  standardError: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  interpretation: string;
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 * 
 * Formula: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
 */
export function calculatePearsonCorrelation(
  x: number[],
  y: number[]
): CorrelationResult {
  // Validate inputs
  if (x.length !== y.length) {
    throw new Error('Arrays must have the same length');
  }

  const n = x.length;

  // Need at least 3 data points for meaningful correlation
  if (n < 3) {
    return {
      coefficient: 0,
      pValue: 1,
      confidence: 0,
      significance: 'not_significant',
      sampleSize: n,
      standardError: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      interpretation: 'Insufficient data (need at least 3 points)',
    };
  }

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  // Calculate components of Pearson formula
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  // Handle edge cases
  if (sumSqX === 0 || sumSqY === 0) {
    return {
      coefficient: 0,
      pValue: 1,
      confidence: 0,
      significance: 'not_significant',
      sampleSize: n,
      standardError: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      interpretation: 'No variance in data',
    };
  }

  // Calculate Pearson's r
  const r = numerator / Math.sqrt(sumSqX * sumSqY);

  // Calculate t-statistic for significance testing
  const tStat = r * Math.sqrt((n - 2) / (1 - r * r));

  // Calculate p-value using t-distribution approximation
  const pValue = calculateTwoTailedPValue(tStat, n - 2);

  // Calculate standard error
  const standardError = Math.sqrt((1 - r * r) / (n - 2));

  // Calculate 95% confidence interval using Fisher's z transformation
  const zr = 0.5 * Math.log((1 + r) / (1 - r)); // Fisher transformation
  const seZ = 1 / Math.sqrt(n - 3);
  const z95 = 1.96; // 95% confidence

  const ciLower = Math.tanh(zr - z95 * seZ);
  const ciUpper = Math.tanh(zr + z95 * seZ);

  // Calculate confidence as inverse of p-value
  const confidence = Math.max(0, Math.min(100, (1 - pValue) * 100));

  return {
    coefficient: r,
    pValue,
    confidence,
    significance: pValue < 0.05 ? 'significant' : 'not_significant',
    sampleSize: n,
    standardError,
    confidenceInterval: { lower: ciLower, upper: ciUpper },
    interpretation: interpretCorrelation(r, pValue),
  };
}

/**
 * Calculate two-tailed p-value from t-statistic
 * Uses approximation of the Student's t-distribution
 */
function calculateTwoTailedPValue(t: number, df: number): number {
  // Use approximation for t-distribution
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;

  // Incomplete beta function approximation
  const p = incompleteBeta(x, a, b);

  return Math.min(1, Math.max(0, p));
}

/**
 * Incomplete beta function approximation
 * Used for calculating p-values
 */
function incompleteBeta(x: number, a: number, b: number): number {
  // Simple approximation using continued fraction
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use symmetry for better convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(1 - x, b, a);
  }

  // Continued fraction approximation
  const maxIterations = 100;
  const epsilon = 1e-10;

  let front = Math.exp(
    a * Math.log(x) + b * Math.log(1 - x) -
    Math.log(a) - logBeta(a, b)
  );

  let f = 1;
  let c = 1;
  let d = 0;

  for (let m = 1; m <= maxIterations; m++) {
    // Even step
    let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;
    c = 1 + num / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    f *= d * c;

    // Odd step
    num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;
    c = 1 + num / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    const delta = d * c;
    f *= delta;

    if (Math.abs(delta - 1) < epsilon) break;
  }

  return front * (f - 1);
}

/**
 * Log of beta function
 */
function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/**
 * Log of gamma function (Stirling approximation)
 */
function logGamma(x: number): number {
  const coef = [
    76.18009172947146, -86.50532032941677,
    24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;

  for (let j = 0; j < 6; j++) {
    ser += coef[j] / ++y;
  }

  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Interpret correlation coefficient
 */
export function interpretCorrelation(r: number, pValue: number): string {
  const absR = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'negative';
  const significant = pValue < 0.05;

  let strength: string;
  if (absR >= 0.9) strength = 'Very strong';
  else if (absR >= 0.7) strength = 'Strong';
  else if (absR >= 0.5) strength = 'Moderate';
  else if (absR >= 0.3) strength = 'Weak';
  else if (absR >= 0.1) strength = 'Very weak';
  else strength = 'Negligible';

  if (!significant && absR > 0.1) {
    return `${strength} ${direction} correlation, but not statistically significant`;
  }

  return `${strength} ${direction} correlation`;
}

/**
 * Calculate correlation for binary variable (0/1) vs continuous
 * Point-biserial correlation - special case of Pearson
 */
export function calculatePointBiserialCorrelation(
  binary: boolean[],
  continuous: number[]
): CorrelationResult {
  // Convert boolean to 0/1
  const x = binary.map(b => (b ? 1 : 0));
  return calculatePearsonCorrelation(x, continuous);
}
