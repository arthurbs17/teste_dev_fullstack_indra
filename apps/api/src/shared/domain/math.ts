export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Razão arredondada; null quando o denominador é zero (sem dados). */
export function ratio(numerator: number, denominator: number, decimals = 4): number | null {
  if (denominator === 0) return null;
  return round(numerator / denominator, decimals);
}
