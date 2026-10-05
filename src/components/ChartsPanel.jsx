// Bar / line charts driven automatically from the CURRENT pivot result:
// pivot rows become the X axis, each column-path becomes a series.
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { BarChart3, LineChart as LineIcon, Layers } from 'lucide-react';
import { valueSpecLabel } from '../lib/pivot';
import { formatAxisValue, formatCurrency, formatNumber, isCurrencyField } from '../lib/format';

const PALETTE = [
  '#1d4ed8', '#059669', '#d97706', '#7c3aed',
  '#dc2626', '#0891b2', '#be185d', '#65a30d',
  '#0f766e', '#b45309',
];
const MAX_SERIES = 10;

function ChartTooltip({ active, payload, label, field, currency }) {
  if (!active || !payload?.length) return null;
  const money = isCurrencyField(field);
  return (
    <div className="chart-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tt-row">
          <span className="tt-dot" style={{ background: p.color || p.fill }} />
          <span className="tt-name">{p.name}</span>
          <span className="tt-val">
            {money ? formatCurrency(p.value, currency) : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartsPanel({ result, config, currency }) {
  const [chartType, setChartType] = useState('bar'); // bar | stacked | line
  const [valueIdx, setValueIdx] = useState(0);
  const [topN, setTopN] = useState(15);

  const spec = result?.values?.[Math.min(valueIdx, (result?.values?.length || 1) - 1)];

  const { data, series, truncated } = useMemo(() => {
    if (!result || result.needsSetup || !result.values.length) {
      return { data: [], series: [], truncated: false };
    }
    const vi = Math.min(valueIdx, result.values.length - 1);
    const allSeries = result.colPaths.map((cp, i) => ({
      key: `s${i}`,
      name: cp.parts.map((p) => p.label).join(' / ') || 'All',
      colKey: cp.key,
    }));
    const shown = allSeries.slice(0, MAX_SERIES);
    const rows = result.rowPaths.slice(0, topN).map((rp) => {
      const point = { name: rp.parts.map((p) => p.label).join(' / ') || '(blank)' };
      for (const s of shown) {
        const vals = result.cells[rp.key]?.[s.colKey];
        point[s.key] = vals ? vals[vi] : null;
      }
      return point;
    });
    return { data: rows, series: shown, truncated: allSeries.length > MAX_SERIES };
  }, [result, valueIdx, topN]);

  if (!result || result.needsSetup) {
    return (
      <div className="empty-state card">
        <BarChart3 size={32} />
        <h3>No chart yet</h3>
        <p>Configure the pivot table first — charts are generated from it automatically.</p>
      </div>
    );
  }
  if (result.empty || !data.length) {
    return (
      <div className="empty-state card">
        <BarChart3 size={32} />
        <h3>Nothing to chart</h3>
        <p>No rows match the current pivot filters.</p>
      </div>
    );
  }

  const money = spec ? isCurrencyField(spec.field) : false;
  const yTick = (v) => formatAxisValue(v, spec?.field, currency);
  const tooltip = (props) => (
    <ChartTooltip {...props} field={spec?.field} currency={currency} />
  );

  const Chart = chartType === 'line' ? LineChart : BarChart;
  const chartTitle = spec ? valueSpecLabel(spec) : '';

  return (
    <div className="card">
      <div className="card-head chart-head">
        <div>
          <h3>{chartTitle}</h3>
          <p className="muted">
            From the current pivot · {data.length} points
            {truncated && ` · showing first ${MAX_SERIES} series`}
          </p>
        </div>
        <div className="chart-controls">
          <div className="seg">
            <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')} title="Bar chart">
              <BarChart3 size={15} />
            </button>
            <button className={chartType === 'stacked' ? 'active' : ''} onClick={() => setChartType('stacked')} title="Stacked bar">
              <Layers size={15} />
            </button>
            <button className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')} title="Line chart">
              <LineIcon size={15} />
            </button>
          </div>
          <select value={valueIdx} onChange={(e) => setValueIdx(Number(e.target.value))} title="Metric">
            {result.values.map((v, i) => (
              <option key={v.id} value={i}>{valueSpecLabel(v)}</option>
            ))}
          </select>
          <select value={topN} onChange={(e) => setTopN(Number(e.target.value))} title="Rows shown">
            {[5, 10, 15, 25, 50].map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={420}>
          <Chart data={data} margin={{ top: 8, right: 16, bottom: 48, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f2" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#5b6b82' }}
              angle={-30}
              textAnchor="end"
              interval="preserveStart"
              height={60}
            />
            <YAxis tickFormatter={yTick} tick={{ fontSize: 11, fill: '#5b6b82' }} width={72} />
            <Tooltip content={tooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chartType === 'line'
              ? series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                ))
              : series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    fill={PALETTE[i % PALETTE.length]}
                    stackId={chartType === 'stacked' ? 'total' : undefined}
                    radius={chartType === 'stacked' ? 0 : [3, 3, 0, 0]}
                  />
                ))}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
