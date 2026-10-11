/** Same rounding as the server (2 decimals, half away from zero). */
export function round2(value: number): number {
  const sign = value < 0 ? -1 : 1;

  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

export interface LineAmounts {
  gross: number;
  taxable: number;
  taxAmount: number;
  lineTotal: number;
}

/**
 * Mirrors the server's LineCalculator so the screen shows the same numbers the API will save.
 * The server is still the source of truth.
 */
export function calcLine(
  quantity: number | null,
  rate: number | null,
  discountAmount: number | null,
  taxPercent: number | null,
): LineAmounts {
  const gross = round2((quantity ?? 0) * (rate ?? 0));
  const taxable = round2(gross - (discountAmount ?? 0));
  const taxAmount = round2((taxable * (taxPercent ?? 0)) / 100);

  return { gross, taxable, taxAmount, lineTotal: round2(taxable + taxAmount) };
}
