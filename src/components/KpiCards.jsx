// Auto-computed KPI cards from the insights definitions.
import { Banknote, TrendingUp, Package, Hash, Gauge } from 'lucide-react';
import { aggregateValues } from '../lib/pivot';
import { formatCurrency, formatNumber } from '../lib/format';

const ICONS = {
  revenue: Banknote,
  profit: TrendingUp,
  units: Package,
  count: Hash,
  average: Gauge,
};

const ACCENTS = ['accent-blue', 'accent-green', 'accent-amber', 'accent-purple', 'accent-teal'];

export default function KpiCards({ rows, kpis, currency }) {
  return (
    <div className="kpi-grid">
      {kpis.map((kpi, i) => {
        const Icon = ICONS[kpi.icon] || Gauge;
        const value = aggregateValues(rows, kpi.field, kpi.agg);
        const display =
          kpi.kind === 'currency'
            ? formatCurrency(value, currency)
            : formatNumber(value, { decimals: kpi.agg === 'average' ? 2 : 0 });
        return (
          <div key={kpi.id} className={`kpi-card ${ACCENTS[i % ACCENTS.length]}`}>
            <div className="kpi-top">
              <span className="kpi-label">{kpi.label}</span>
              <span className="kpi-icon"><Icon size={18} /></span>
            </div>
            <div className="kpi-value">{display}</div>
            <div className="kpi-sub">
              {kpi.agg === 'count'
                ? 'rows in dataset'
                : `${kpi.agg} across ${rows.length.toLocaleString()} records`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
