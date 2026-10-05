// Auto-configuration: inspect a freshly loaded dataset and decide what the
// default pivot table, KPI cards and chart setup should be — so everything
// is populated with zero clicks, like Excel's "Recommended PivotTables".
import { emptyConfig, uid } from './pivot';
import { listDistinctValues } from './pivot';

const DATE_KEYWORDS = [
  'date', 'order date', 'invoice', 'transaction', 'created', 'posted',
  'time', 'day', 'month', 'period', 'billing', 'settlement',
];
const CATEGORY_KEYWORDS = [
  'region', 'product', 'category', 'salesperson', 'sales rep', 'rep',
  'department', 'channel', 'segment', 'store', 'customer', 'branch',
  'territory', 'division', 'team', 'type', 'status', 'market',
];
const MEASURE_KEYWORDS = [
  'revenue', 'sales', 'amount', 'total', 'price', 'profit', 'cost',
  'expense', 'units', 'quantity', 'qty', 'margin', 'income', 'gross',
  'net', 'turnover', 'budget', 'balance',
];

/** Keyword relevance score of a header against a keyword list. */
function scoreHeader(header, keywords) {
  const h = String(header).toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (h === kw) score += 12;
    else if (h.includes(` ${kw} `) || h.startsWith(`${kw} `) || h.endsWith(` ${kw}`)) score += 7;
    else if (h.includes(kw)) score += 3;
  }
  return score;
}

function sortByScore(headers, keywords) {
  return headers
    .map((h) => ({ h, s: scoreHeader(h, keywords) }))
    .sort((a, b) => b.s - a.s || a.h.localeCompare(b.h))
    .map((x) => x.h);
}

function bestMeasure(measureCols, keywords) {
  const ranked = sortByScore(measureCols, keywords);
  return ranked.find((h) => scoreHeader(h, keywords) > 0) || null;
}

/** "Revenue (LKR)" -> "Revenue" for KPI labels. */
function cleanLabel(header) {
  return String(header)
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s*[-–]\s*\w{3}\s*$/i, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build the default pivot config, KPI definitions and detected roles for
 * a dataset. Everything needed to render a useful dashboard instantly.
 */
export function autoConfig(headers, rows, types) {
  const dateCandidates = headers.filter((h) => types[h] === 'date');
  const dateCol =
    sortByScore(dateCandidates, DATE_KEYWORDS).find((h) => scoreHeader(h, DATE_KEYWORDS) > 0) ||
    dateCandidates[0] ||
    null;

  const textCandidates = headers.filter((h) => h !== dateCol && types[h] === 'text');
  const categoryCols = sortByScore(textCandidates, CATEGORY_KEYWORDS).filter(
    (h) => listDistinctValues(rows, h).length <= 500
  );

  const measureCandidates = headers.filter((h) => types[h] === 'number');
  // Finance-first ordering: money measures (revenue, profit…) rank above
  // generic counts (units…), so the default pivot & charts lead with money.
  const MEASURE_PRIORITY = [
    'revenue', 'sales', 'profit', 'amount', 'total', 'income', 'turnover',
    'cost', 'expense', 'price', 'margin', 'gross', 'net', 'budget', 'balance',
    'units', 'quantity', 'qty',
  ];
  const measurePriority = (h) => {
    const low = String(h).toLowerCase();
    const i = MEASURE_PRIORITY.findIndex((kw) => low.includes(kw));
    return i === -1 ? MEASURE_PRIORITY.length : i;
  };
  const measureCols = measureCandidates
    .map((h) => ({ h, p: measurePriority(h), s: scoreHeader(h, MEASURE_KEYWORDS) }))
    .sort((a, b) => a.p - b.p || b.s - a.s || a.h.localeCompare(b.h))
    .map((x) => x.h);

  // --- default pivot config ---------------------------------------------
  const config = emptyConfig();
  if (dateCol) {
    config.rows = [dateCol];
    config.dateGrouping[dateCol] = 'month';
  } else if (categoryCols[0]) {
    config.rows = [categoryCols[0]];
  }
  if (categoryCols[0]) config.columns = [categoryCols[0]];
  else if (categoryCols[1]) config.columns = [categoryCols[1]];

  const defaultMeasures = measureCols.slice(0, 2);
  const measuresToUse = defaultMeasures.length ? defaultMeasures : measureCandidates.slice(0, 1);
  for (const m of measuresToUse) {
    config.values.push({ id: uid(), field: m, agg: 'sum' });
  }

  // --- KPI cards ---------------------------------------------------------
  const revenueField = bestMeasure(measureCols, ['revenue', 'sales', 'amount', 'total', 'income', 'turnover']);
  const profitField = bestMeasure(measureCols, ['profit', 'margin', 'net']);
  const unitsField = bestMeasure(measureCols, ['units', 'quantity', 'qty']);
  const fallbackMeasure = measureCols[0] || null;

  const kpis = [];
  const money = revenueField || fallbackMeasure;
  if (money) {
    kpis.push({
      id: 'kpi-revenue', label: `Total ${cleanLabel(money)}`, field: money,
      agg: 'sum', kind: 'currency', icon: 'revenue',
    });
  }
  if (profitField && profitField !== money) {
    kpis.push({
      id: 'kpi-profit', label: `Total ${cleanLabel(profitField)}`, field: profitField,
      agg: 'sum', kind: 'currency', icon: 'profit',
    });
  }
  if (unitsField && unitsField !== money && unitsField !== profitField) {
    kpis.push({
      id: 'kpi-units', label: `Total ${cleanLabel(unitsField)}`, field: unitsField,
      agg: 'sum', kind: 'number', icon: 'units',
    });
  }
  if (profitField && money) {
    kpis.push({
      id: 'kpi-avg', label: `Avg ${cleanLabel(money)} / Record`, field: money,
      agg: 'average', kind: 'currency', icon: 'average',
    });
  }
  kpis.push({
    id: 'kpi-count', label: 'Total Records', field: headers[0] || 'rows',
    agg: 'count', kind: 'number', icon: 'count',
  });

  return {
    dateCol,
    categoryCols,
    measureCols,
    pivotConfig: config,
    kpis: kpis.slice(0, 5),
  };
}
