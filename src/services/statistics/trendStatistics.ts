/**
 * Rigorous Non-Parametric Environmental Statistics
 * - Mann-Kendall Monotonic Trend Test
 * - Sen's Slope Estimator with 95% Confidence Intervals
 * - Ordinary Least Squares (OLS) Linear Regression with R²
 * - Pearson Correlation Coefficient
 */

export interface MannKendallResult {
  tau: number;
  zScore: number;
  pValue: number;
  trendDirection: 'INCREASING' | 'DECREASING' | 'NO_TREND';
  significant: boolean;
  testMethod?: string;
}

export interface PettittResult {
  date: string;
  pValue: number;
  significant: boolean;
  method: string;
}

export interface SensSlopeResult {
  slopePerYear: number;
  slopePerDecade: number;
  ciLower: number;
  ciUpper: number;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  unitPerDecade: number;
}

/** Standard normal CDF error function approximation */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

export function calculateMannKendall(values: number[]): MannKendallResult {
  const n = values.length;
  if (n < 4) {
    return {
      tau: 0,
      zScore: 0,
      pValue: 1,
      trendDirection: 'NO_TREND',
      significant: false,
      testMethod: 'Mann-Kendall (Original)',
    };
  }

  let s = 0;
  for (let k = 0; k < n - 1; k++) {
    for (let j = k + 1; j < n; j++) {
      const diff = values[j] - values[k];
      if (diff > 0) s += 1;
      else if (diff < 0) s -= 1;
    }
  }

  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  let z = 0;
  if (s > 0) {
    z = (s - 1) / Math.sqrt(varS);
  } else if (s < 0) {
    z = (s + 1) / Math.sqrt(varS);
  }

  const pValue = Math.max(
    0.0001,
    2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)))
  );
  const tau = (2 * s) / (n * (n - 1));
  const significant = pValue < 0.05;
  const trendDirection =
    !significant ? 'NO_TREND' : tau > 0 ? 'INCREASING' : 'DECREASING';

  return {
    tau: Number(tau.toFixed(4)),
    zScore: Number(z.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    trendDirection,
    significant,
    testMethod: 'Mann-Kendall (Original)',
  };
}

/**
 * Hirsch, Slack & Smith (1982) Seasonal Mann-Kendall test for monthly time series
 */
export function calculateSeasonalMannKendall(
  values: number[],
  period = 12
): MannKendallResult {
  const n = values.length;
  if (n < period * 2) {
    return calculateMannKendall(values);
  }

  let totalS = 0;
  let totalVar = 0;
  let totalPairs = 0;

  for (let m = 0; m < period; m++) {
    const seasonVals: number[] = [];
    for (let i = m; i < n; i += period) {
      seasonVals.push(values[i]);
    }
    const nm = seasonVals.length;
    if (nm < 2) continue;
    let sM = 0;
    for (let k = 0; k < nm - 1; k++) {
      for (let j = k + 1; j < nm; j++) {
        const diff = seasonVals[j] - seasonVals[k];
        if (diff > 0) sM += 1;
        else if (diff < 0) sM -= 1;
      }
    }
    totalS += sM;
    totalVar += (nm * (nm - 1) * (2 * nm + 5)) / 18;
    totalPairs += (nm * (nm - 1)) / 2;
  }

  let z = 0;
  if (totalVar > 0) {
    if (totalS > 0) z = (totalS - 1) / Math.sqrt(totalVar);
    else if (totalS < 0) z = (totalS + 1) / Math.sqrt(totalVar);
  }

  const pValue = Math.max(
    0.0001,
    2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)))
  );
  const tau = totalPairs > 0 ? totalS / totalPairs : 0;
  const significant = pValue < 0.05;
  const trendDirection =
    !significant ? 'NO_TREND' : tau > 0 ? 'INCREASING' : 'DECREASING';

  return {
    tau: Number(tau.toFixed(4)),
    zScore: Number(z.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    trendDirection,
    significant,
    testMethod: 'Seasonal Mann-Kendall (Hirsch–Slack, period=12)',
  };
}

/**
 * Pettitt (1979) non-parametric single change-point test on interior observations
 */
export function calculatePettittChangePoint(
  timestamps: string[],
  values: number[]
): PettittResult {
  const n = Math.min(timestamps.length, values.length);
  const fallbackDate = timestamps[0] || '';
  if (n < 10) {
    return {
      date: fallbackDate,
      pValue: 1,
      significant: false,
      method: 'Pettitt (1979) non-parametric change-point test',
    };
  }

  // Compute average mid-ranks
  const indexed = values
    .slice(0, n)
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  let idx = 0;
  while (idx < n) {
    let end = idx;
    while (end + 1 < n && indexed[end + 1].v === indexed[idx].v) end++;
    const avgRank = (idx + end) / 2 + 1;
    for (let k = idx; k <= end; k++) {
      ranks[indexed[k].i] = avgRank;
    }
    idx = end + 1;
  }

  const edge = Math.max(4, Math.floor(0.1 * n));
  const loBound = edge * 2 >= n ? Math.max(2, Math.floor(n / 4)) : edge;
  const hiBound = n - loBound;

  let cumRank = 0;
  let maxU = -1;
  let bestK = loBound;
  for (let k = 1; k <= hiBound; k++) {
    cumRank += ranks[k - 1];
    if (k >= loBound) {
      const uK = Math.abs(2 * cumRank - k * (n + 1));
      if (uK > maxU) {
        maxU = uK;
        bestK = k;
      }
    }
  }

  const denom = n * n * n + n * n;
  const rawP = denom > 0 ? 2 * Math.exp((-6 * maxU * maxU) / denom) : 1;
  const pValue = Math.min(1, Math.max(0.0001, Number(rawP.toFixed(4))));

  return {
    date: timestamps[Math.min(bestK, n - 1)] || fallbackDate,
    pValue,
    significant: pValue < 0.05,
    method: 'Pettitt (1979) non-parametric change-point test',
  };
}

export function calculateSensSlope(
  values: number[],
  pointsPerYear = 12
): SensSlopeResult {
  const n = values.length;
  if (n < 4) {
    return {
      slopePerYear: 0,
      slopePerDecade: 0,
      ciLower: 0,
      ciUpper: 0,
    };
  }

  const slopes: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    for (let j = k + 1; j < n; j++) {
      slopes.push((values[j] - values[k]) / (j - k));
    }
  }

  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  const medianSlope =
    slopes.length % 2 !== 0
      ? slopes[mid]
      : (slopes[mid - 1] + slopes[mid]) / 2;

  const slopePerYear = medianSlope * pointsPerYear;
  const slopePerDecade = slopePerYear * 10;

  // Sen (1968) 95% CI around the median pairwise slope (hollander-wolfe normal approx)
  const totalN = slopes.length;
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const cAlpha = 1.95996 * Math.sqrt(varS);
  const lowerIdx = Math.max(0, Math.min(totalN - 1, Math.floor((totalN - cAlpha) / 2)));
  const upperIdx = Math.max(0, Math.min(totalN - 1, Math.ceil((totalN + cAlpha) / 2)));
  const ciLower = slopes[lowerIdx] * pointsPerYear * 10;
  const ciUpper = slopes[upperIdx] * pointsPerYear * 10;

  return {
    slopePerYear: Number(slopePerYear.toFixed(5)),
    slopePerDecade: Number(slopePerDecade.toFixed(4)),
    ciLower: Number(ciLower.toFixed(4)),
    ciUpper: Number(ciUpper.toFixed(4)),
  };
}

export function calculateLinearRegression(
  values: number[],
  pointsPerYear = 12
): LinearRegressionResult {
  const n = values.length;
  if (n === 0) {
    return { slope: 0, intercept: 0, rSquared: 0, unitPerDecade: 0 };
  }

  const tMean = (n - 1) / 2;
  const yMean = values.reduce((sum, v) => sum + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dt = i - tMean;
    const dy = values[i] - yMean;
    num += dt * dy;
    den += dt * dt;
  }

  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * tMean;

  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = intercept + slope * i;
    ssTot += (values[i] - yMean) ** 2;
    ssRes += (values[i] - yPred) ** 2;
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const unitPerDecade = slope * pointsPerYear * 10;

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(2)),
    rSquared: Number(rSquared.toFixed(2)),
    unitPerDecade: Number(unitPerDecade.toFixed(3)),
  };
}

export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den !== 0 ? Number((num / den).toFixed(3)) : 0;
}

