// Column type detection: 'number' | 'date' | 'text'.
// Samples up to 200 rows; a column wins a type when >80% of its
// non-empty values parse as that type.

export function isNumericValue(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const t = v.trim().replace(/,/g, '');
    if (t === '') return false;
    return !Number.isNaN(Number(t));
  }
  return false;
}

export function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.trim().replace(/,/g, ''));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Only strings that look like dates (not codes like "ORD-10001", which
 *  V8's Date.parse would happily misread as year 10001). */
const DATE_LIKE =
  /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{1,2}[\s,]*\d{2,4})|(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{2,4})|((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{4})/i;

/** Parse a cell value into a Date, or null when it is not date-like. */
export function parseDateValue(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    // Excel serial date fallback (only for plausible serial ranges).
    if (v > 20000 && v < 80000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '' || isNumericValue(t) || !DATE_LIKE.test(t)) return null;
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? null : new Date(ms);
  }
  return null;
}

/** Map of header -> 'number' | 'date' | 'text'. */
export function detectColumnTypes(headers, rows) {
  const sample = rows.slice(0, 200);
  const types = {};
  for (const h of headers) {
    let numeric = 0;
    let dates = 0;
    let nonEmpty = 0;
    for (const row of sample) {
      const v = row[h];
      if (v === null || v === undefined || v === '') continue;
      nonEmpty++;
      if (isNumericValue(v)) numeric++;
      else if (parseDateValue(v)) dates++;
    }
    if (nonEmpty === 0) types[h] = 'text';
    else if (numeric / nonEmpty > 0.8) types[h] = 'number';
    else if (dates / nonEmpty > 0.8) types[h] = 'date';
    else types[h] = 'text';
  }
  return types;
}
