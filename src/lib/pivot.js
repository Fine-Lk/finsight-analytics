// Excel-style pivot engine.
// config = {
//   rows: [field...], columns: [field...],
//   values: [{ id, field, agg }],
//   filters: { field: [selectedKeys] },
//   dateGrouping: { field: 'day'|'month'|'quarter'|'year' },
//   showRowTotals, showColTotals, showGrandTotal
// }
import { parseDateValue, isNumericValue, toNumber } from './types';

export const AGGREGATIONS = [
  { id: 'sum', label: 'Sum' },
  { id: 'count', label: 'Count' },
  { id: 'average', label: 'Average' },
  { id: 'min', label: 'Min' },
  { id: 'max', label: 'Max' },
  { id: 'distinct', label: 'Distinct Count' },
];

export const DATE_GRANULARITIES = [
  { id: 'day', label: 'Day' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

let uidCounter = 0;
export function uid() {
  uidCounter += 1;
  return `f${Date.now().toString(36)}${uidCounter.toString(36)}`;
}

export function emptyConfig() {
  return {
    rows: [],
    columns: [],
    values: [],
    filters: {},
    dateGrouping: {},
    showRowTotals: true,
    showColTotals: true,
    showGrandTotal: true,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => String(n).padStart(2, '0');

/** Stable grouping key for any cell value (dates use epoch ms). */
export function valueKey(v) {
  if (v === null || v === undefined || v === '') return '__blank__';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `__date__${v.getTime()}`;
  return String(v);
}

/** Human-readable label for a cell value. */
export function valueLabel(v) {
  if (v === null || v === undefined || v === '') return '(blank)';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${pad2(v.getDate())} ${MONTHS[v.getMonth()]} ${v.getFullYear()}`;
  }
  return String(v);
}

/** Distinct { key, label } pairs for a field (used by the filter UI). */
export function listDistinctValues(rows, field) {
  const map = new Map();
  for (const row of rows) {
    const k = valueKey(row[field]);
    if (!map.has(k)) map.set(k, valueLabel(row[field]));
  }
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Group a date value into a sortable { key, label } bucket. */
export function groupDate(value, granularity) {
  const d = parseDateValue(value);
  if (!d) return { key: '__blank__', label: '(blank)' };
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (granularity) {
    case 'year':
      return { key: `${y}`, label: `${y}` };
    case 'quarter': {
      const q = Math.floor(m / 3) + 1;
      return { key: `${y}-Q${q}`, label: `Q${q} ${y}` };
    }
    case 'month':
      return { key: `${y}-${pad2(m + 1)}`, label: `${MONTHS[m]} ${y}` };
    case 'day':
    default:
      return {
        key: `${y}-${pad2(m + 1)}-${pad2(d.getDate())}`,
        label: `${pad2(d.getDate())} ${MONTHS[m]} ${y}`,
      };
  }
}

/** Aggregate one value spec over a set of rows. */
export function aggregateValues(rows, field, agg) {
  if (agg === 'count') {
    return rows.filter((r) => r[field] !== null && r[field] !== undefined && r[field] !== '').length;
  }
  if (agg === 'distinct') {
    const set = new Set();
    for (const r of rows) {
      const v = r[field];
      if (v !== null && v !== undefined && v !== '') set.add(valueKey(v));
    }
    return set.size;
  }
  const nums = [];
  for (const r of rows) {
    const v = r[field];
    if (v === null || v === undefined || v === '') continue;
    if (isNumericValue(v)) {
      const n = toNumber(v);
      if (n !== null) nums.push(n);
    }
  }
  if (!nums.length) return null;
  switch (agg) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0);
    case 'average':
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min':
      return Math.min(...nums);
    case 'max':
      return Math.max(...nums);
    default:
      return null;
  }
}

export function valueSpecLabel(spec) {
  const agg = AGGREGATIONS.find((a) => a.id === spec.agg);
  return `${agg ? agg.label : spec.agg} of ${spec.field}`;
}

function keyFor(field, row, config, types) {
  const granularity = types[field] === 'date' ? config.dateGrouping[field] : null;
  if (granularity) return groupDate(row[field], granularity);
  return { key: valueKey(row[field]), label: valueLabel(row[field]) };
}

/**
 * Compute the pivot. Returns ordered row/col key paths, the cell matrix,
 * totals, and metadata consumed by PivotTable + ChartsPanel.
 */
export function computePivot(rows, config, types) {
  const cfg = { ...emptyConfig(), ...config };
  const { rows: rowFields, columns: colFields, values } = cfg;

  // --- filters -----------------------------------------------------------
  const activeFilters = Object.entries(cfg.filters || {}).filter(
    ([, sel]) => Array.isArray(sel)
  );
  const filtered = rows.filter((row) =>
    activeFilters.every(([field, selected]) => selected.includes(valueKey(row[field])))
  );

  const needsSetup = values.length === 0;

  // --- grouping ----------------------------------------------------------
  const rowPaths = [];
  const rowIndex = new Map();
  const colPaths = [];
  const colIndex = new Map();
  const groups = new Map(); // rowKey -> Map(colKey -> rows[])

  for (const row of filtered) {
    const rp = rowFields.map((f) => keyFor(f, row, cfg, types));
    const cp = colFields.map((f) => keyFor(f, row, cfg, types));
    const rk = rp.map((p) => p.key).join('\u0001');
    const ck = cp.map((p) => p.key).join('\u0001');

    if (!rowIndex.has(rk)) {
      rowIndex.set(rk, rowPaths.length);
      rowPaths.push({ key: rk, parts: rp });
    }
    if (!colIndex.has(ck)) {
      colIndex.set(ck, colPaths.length);
      colPaths.push({ key: ck, parts: cp });
    }
    if (!groups.has(rk)) groups.set(rk, new Map());
    const gm = groups.get(rk);
    if (!gm.has(ck)) gm.set(ck, []);
    gm.get(ck).push(row);
  }

  // Date-grouped axes sort chronologically (ISO keys sort naturally);
  // text axes keep first-seen order like Excel.
  const sortIfDateGrouped = (paths, fields) => {
    if (fields.length && types[fields[0]] === 'date' && cfg.dateGrouping[fields[0]]) {
      paths.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    }
  };
  sortIfDateGrouped(rowPaths, rowFields);
  sortIfDateGrouped(colPaths, colFields);

  // --- aggregation -------------------------------------------------------
  const cells = {}; // rowKey -> { colKey -> [v1, v2, ...] }
  const rowTotals = {};
  const colTotals = {};

  for (const rp of rowPaths) {
    cells[rp.key] = {};
    const gm = groups.get(rp.key);
    const allRowRows = [];
    for (const cp of colPaths) {
      const g = gm.get(cp.key) || [];
      allRowRows.push(...g);
      cells[rp.key][cp.key] = values.map((spec) => aggregateValues(g, spec.field, spec.agg));
    }
    rowTotals[rp.key] = values.map((spec) => aggregateValues(allRowRows, spec.field, spec.agg));
  }

  for (const cp of colPaths) {
    const allColRows = [];
    for (const rp of rowPaths) {
      const g = (groups.get(rp.key) || new Map()).get(cp.key) || [];
      allColRows.push(...g);
    }
    colTotals[cp.key] = values.map((spec) => aggregateValues(allColRows, spec.field, spec.agg));
  }

  const grandTotals = values.map((spec) => aggregateValues(filtered, spec.field, spec.agg));

  return {
    rowFields,
    colFields,
    values,
    rowPaths,
    colPaths,
    cells,
    rowTotals,
    colTotals,
    grandTotals,
    rowCount: filtered.length,
    totalRows: rows.length,
    needsSetup,
    empty: filtered.length === 0,
  };
}
