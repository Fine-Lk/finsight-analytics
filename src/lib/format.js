// Number & currency formatting helpers.
// Currency is user-selectable (default LKR); compact notation is used
// on chart axes, full precision in tables and KPIs.

export const CURRENCIES = [
  { code: 'LKR', label: 'Sri Lankan Rupee (Rs)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
];

export function formatNumber(value, opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const { decimals = 2, compact = false } = opts;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
  }).format(value);
}

export function formatCurrency(value, code = 'LKR', opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const { compact = false } = opts;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return formatNumber(value, opts);
  }
}

/** Heuristic: does this field name look like money? */
export function isCurrencyField(field) {
  return /(revenue|sales|amount|total|price|profit|cost|expense|income|turnover|budget|gross|\bnet\b|\blkr\b|\brs\b|\busd\b|\beur\b|\binr\b)/i.test(
    String(field || '')
  );
}

/** Format one pivot cell based on its field name + aggregation. */
export function formatPivotValue(value, field, agg, currency) {
  if (agg === 'count' || agg === 'distinct') {
    return formatNumber(value, { decimals: 0 });
  }
  if (isCurrencyField(field)) return formatCurrency(value, currency);
  return formatNumber(value);
}

/** Axis-friendly formatter for charts. */
export function formatAxisValue(value, field, currency) {
  if (isCurrencyField(field)) return formatCurrency(value, currency, { compact: true });
  return formatNumber(value, { compact: true, decimals: 1 });
}
