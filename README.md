# FinSight Analytics

A business development & finance data-analysis web app. Upload an Excel/CSV file and
FinSight **auto-detects** your dates, categories and money columns, then builds
**Excel-style pivot tables**, **KPI cards**, and **bar / line charts** for you — everything
configurable with zero clicks required.

## Run it

```bash
cd ~/workspace/bizfinance-analytics
npm install
npm run dev        # → http://localhost:5173
```

Production build:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Features

- **Excel/CSV upload** — drag & drop `.xlsx`, `.xls`, `.csv`; multi-sheet workbooks get a sheet picker.
- **Auto data detection** — headers trimmed, empty rows dropped, dates parsed; each column classified as `number` / `date` / `text` (>80% rule over a 200-row sample).
- **Auto-configuration** — keyword scoring finds the best date column (grouped by month), category columns (region, product, salesperson…) and measure columns (revenue, profit, units…); the pivot, KPIs and charts are pre-filled instantly.
- **Excel-like pivot builder** — drag & drop (or click-to-add) fields into Rows / Columns / Values / Filters:
  - multiple row, column and value fields
  - aggregations: Sum, Count, Average, Min, Max, Distinct Count (per value field)
  - date grouping: Day / Month / Quarter / Year on any date field in Rows/Columns
  - filters with searchable checkbox lists
  - row / column / grand total toggles
- **Pivot grid** — sticky headers, currency-aware formatting, highlighted totals.
- **Charts** — bar, stacked bar and line charts generated live from the current pivot; metric selector, Top-N control, currency-formatted tooltips.
- **KPI cards** — Total Revenue, Total Profit, Avg per record, record count, etc., auto-derived from your columns.
- **Export** — one-click pivot export to `.xlsx` or `.csv`.
- **Currency selector** — LKR (default), USD, EUR, INR.
- **Sample data** — 600 realistic sales orders (FY 2025–2026) if you just want to explore.

## Project layout

```
src/
  lib/
    excel.js        SheetJS parsing → { headers, rows }
    types.js        column type detection
    pivot.js        pivot engine (grouping, aggregations, filters, date buckets)
    insights.js     auto-configuration (keyword scoring → default pivot + KPIs)
    format.js       number/currency formatting (LKR/USD/EUR/INR)
    sampleData.js   deterministic 600-row demo dataset
    export.js       pivot → .xlsx / .csv download
  components/
    FileUpload.jsx  drag & drop + sheet picker
    DataPreview.jsx  first 100 rows + type badges
    PivotBuilder.jsx field list + drop zones + filters + totals toggles
    ChartsPanel.jsx  recharts bar/line/stacked charts from the pivot
    KpiCards.jsx     auto KPI cards
  App.jsx           tabs, state, auto-load pipeline
```

## Tech

React 19 + Vite · SheetJS (`xlsx`) · Recharts · Lucide icons · hand-written CSS (no framework).
