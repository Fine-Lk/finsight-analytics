// FinSight Analytics — business development & finance data analysis.
// Upload an Excel/CSV file (or try the sample data): column types are
// detected, the pivot table auto-configures, and KPIs + charts render
// instantly. Everything the pivot builder changes flows live into the
// grid and the charts.
import { useMemo, useState } from 'react';
import {
  LayoutDashboard, Table2, BarChart3, Database, Sparkles,
  Download, FileDown, RefreshCw, Wallet,
} from 'lucide-react';
import FileUpload from './components/FileUpload.jsx';
import DataPreview from './components/DataPreview.jsx';
import PivotBuilder from './components/PivotBuilder.jsx';
import PivotTable from './components/PivotTable.jsx';
import ChartsPanel from './components/ChartsPanel.jsx';
import KpiCards from './components/KpiCards.jsx';
import { detectColumnTypes } from './lib/types.js';
import { autoConfig } from './lib/insights.js';
import { computePivot } from './lib/pivot.js';
import { generateSampleData } from './lib/sampleData.js';
import { exportPivot } from './lib/export.js';
import { CURRENCIES } from './lib/format.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pivot', label: 'Pivot Table', icon: Table2 },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'data', label: 'Data', icon: Database },
];

export default function App() {
  const [dataset, setDataset] = useState(null); // { name, headers, rows, types }
  const [config, setConfig] = useState(null);   // pivot config
  const [kpis, setKpis] = useState([]);
  const [currency, setCurrency] = useState('LKR');
  const [tab, setTab] = useState('dashboard');

  /** Shared entry point for uploaded files AND sample data. */
  function loadDataset(name, headers, rows) {
    const types = detectColumnTypes(headers, rows);
    const auto = autoConfig(headers, rows, types);
    setDataset({ name, headers, rows, types });
    setConfig(auto.pivotConfig);
    setKpis(auto.kpis);
    setTab('dashboard');
  }

  function loadSample() {
    const { headers, rows } = generateSampleData();
    loadDataset('Sample data  ·  FY 2025–2026 sales orders', headers, rows);
  }

  function resetAuto() {
    if (!dataset) return;
    const auto = autoConfig(dataset.headers, dataset.rows, dataset.types);
    setConfig(auto.pivotConfig);
    setKpis(auto.kpis);
  }

  const pivotResult = useMemo(
    () => (dataset && config ? computePivot(dataset.rows, config, dataset.types) : null),
    [dataset, config]
  );

  // ---------------- landing (no dataset yet) ----------------
  if (!dataset) {
    return (
      <div className="landing">
        <div className="landing-card">
          <div className="brand">
            <span className="brand-mark"><Wallet size={22} /></span>
            <span className="brand-name">FinSight Analytics</span>
          </div>
          <h1>Turn spreadsheets into business insight</h1>
          <p className="landing-sub">
            Upload an Excel or CSV file and FinSight auto-detects your dates, categories
            and money columns — then builds pivot tables, KPIs and charts for you,
            ready to explore like Excel's pivot tables.
          </p>
          <FileUpload onDataset={({ name, headers, rows }) => loadDataset(name, headers, rows)} />
          <div className="divider"><span>or</span></div>
          <button className="primary-btn big" onClick={loadSample}>
            <Sparkles size={17} /> Try the sample business data
          </button>
          <p className="muted small">600 sales orders · regions, products, revenue, cost &amp; profit — no upload needed.</p>
        </div>
      </div>
    );
  }

  // ---------------- main app ----------------
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Wallet size={20} /></span>
          <span className="brand-name">FinSight</span>
        </div>
        <nav>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`nav-item ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={17} /> {t.label}
              </button>
            );
          })}
        </nav>
        <div className="side-foot">
          <label className="cur-label">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="cur-select">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <button className="ghost-btn light" onClick={() => setDataset(null)} title="Load a different file">
            <RefreshCw size={13} /> New file
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{TABS.find((t) => t.id === tab).label}</h2>
            <p className="muted">{dataset.name} · {dataset.rows.length.toLocaleString()} rows</p>
          </div>
          {tab === 'pivot' && pivotResult && !pivotResult.needsSetup && !pivotResult.empty && (
            <div className="export-btns">
              <button className="secondary-btn" onClick={() => exportPivot(pivotResult, config, 'csv', 'finsight-pivot')}>
                <FileDown size={15} /> CSV
              </button>
              <button className="secondary-btn" onClick={() => exportPivot(pivotResult, config, 'xlsx', 'finsight-pivot')}>
                <Download size={15} /> Excel
              </button>
            </div>
          )}
        </header>

        <section className="content">
          {tab === 'dashboard' && (
            <>
              <KpiCards rows={dataset.rows} kpis={kpis} currency={currency} />
              <ChartsPanel result={pivotResult} config={config} currency={currency} />
            </>
          )}

          {tab === 'pivot' && (
            <>
              <PivotBuilder
                headers={dataset.headers}
                rows={dataset.rows}
                types={dataset.types}
                config={config}
                onChange={setConfig}
                onResetAuto={resetAuto}
              />
              <PivotTable result={pivotResult} config={config} currency={currency} />
            </>
          )}

          {tab === 'charts' && (
            <ChartsPanel result={pivotResult} config={config} currency={currency} />
          )}

          {tab === 'data' && (
            <DataPreview headers={dataset.headers} rows={dataset.rows} types={dataset.types} />
          )}
        </section>
      </main>
    </div>
  );
}
