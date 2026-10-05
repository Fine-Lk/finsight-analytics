// Excel-style pivot designer: field list + Rows / Columns / Values / Filters
// drop zones. Supports BOTH HTML5 drag-and-drop and click-to-add buttons.
import { useMemo, useState } from 'react';
import {
  Hash, CalendarDays, Type, X, Rows3, Columns3, Sigma, Filter,
  Search, RotateCcw, GripVertical, ChevronDown,
} from 'lucide-react';
import {
  AGGREGATIONS, DATE_GRANULARITIES, uid, listDistinctValues,
} from '../lib/pivot';

const TYPE_ICON = { number: Hash, date: CalendarDays, text: Type };

function FieldTypeIcon({ type }) {
  const Icon = TYPE_ICON[type] || Type;
  return <Icon size={14} className={`ftype ftype-${type}`} />;
}

function DropZone({ title, icon: Icon, onDropField, children, hint }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`zone ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.getData('text/plain');
        if (f) onDropField(f);
      }}
    >
      <div className="zone-head"><Icon size={15} /> {title}</div>
      <div className="zone-body">
        {children}
        {!children?.length && <div className="zone-hint">{hint}</div>}
      </div>
    </div>
  );
}

function FilterEditor({ field, rows, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const options = useMemo(() => listDistinctValues(rows, field), [rows, field]);
  const visible = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const allKeys = options.map((o) => o.key);

  return (
    <div className="filter-wrap">
      <button className="chip filter-chip" onClick={() => setOpen((v) => !v)} title="Edit filter values">
        <Filter size={12} />
        <span className="chip-name">{field}</span>
        <span className="chip-count">{selected.length}/{options.length}</span>
        <ChevronDown size={12} className={open ? 'flip' : ''} />
      </button>
      {open && (
        <div className="filter-panel">
          <div className="filter-search">
            <Search size={13} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search values…" />
          </div>
          <div className="filter-actions">
            <button onClick={() => onChange(allKeys)}>Select all</button>
            <button onClick={() => onChange([])}>Clear</button>
          </div>
          <div className="filter-list">
            {visible.map((o) => (
              <label key={o.key} className="filter-opt">
                <input
                  type="checkbox"
                  checked={selected.includes(o.key)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, o.key]
                      : selected.filter((k) => k !== o.key);
                    onChange(next);
                  }}
                />
                <span>{o.label}</span>
              </label>
            ))}
            {!visible.length && <div className="muted pad">No values match.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PivotBuilder({ headers, rows, types, config, onChange, onResetAuto }) {
  const [q, setQ] = useState('');

  const visibleFields = q
    ? headers.filter((h) => h.toLowerCase().includes(q.toLowerCase()))
    : headers;

  function addTo(zone, field) {
    const next = { ...config };
    if (zone === 'rows' && !next.rows.includes(field)) next.rows = [...next.rows, field];
    if (zone === 'columns' && !next.columns.includes(field)) next.columns = [...next.columns, field];
    if (zone === 'values') next.values = [...next.values, { id: uid(), field, agg: 'sum' }];
    if (zone === 'filters' && !next.filters[field]) {
      next.filters = { ...next.filters, [field]: listDistinctValues(rows, field).map((o) => o.key) };
    }
    onChange(next);
  }

  function removeField(zone, field) {
    const next = { ...config };
    if (zone === 'rows') next.rows = next.rows.filter((f) => f !== field);
    if (zone === 'columns') next.columns = next.columns.filter((f) => f !== field);
    if (zone === 'filters') {
      const { [field]: _drop, ...rest } = next.filters;
      next.filters = rest;
    }
    onChange(next);
  }

  function setTotals(patch) {
    onChange({ ...config, ...patch });
  }

  // Chip shared by Rows / Columns zones (with date-grouping selector).
  function axisChip(field, zone) {
    const isDate = types[field] === 'date';
    return (
      <div className="chip" key={field}>
        <FieldTypeIcon type={types[field]} />
        <span className="chip-name">{field}</span>
        {isDate && (
          <select
            className="chip-select"
            value={config.dateGrouping[field] || 'month'}
            onChange={(e) =>
              onChange({
                ...config,
                dateGrouping: { ...config.dateGrouping, [field]: e.target.value },
              })
            }
            title="Date grouping"
          >
            {DATE_GRANULARITIES.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        )}
        <button className="chip-x" onClick={() => removeField(zone, field)} title="Remove">×</button>
      </div>
    );
  }

  return (
    <div className="builder">
      {/* ---- field list ---- */}
      <div className="card field-list-card">
        <div className="card-head">
          <h3>Fields</h3>
          <button className="ghost-btn" onClick={onResetAuto} title="Reset to the auto-detected layout">
            <RotateCcw size={13} /> Auto
          </button>
        </div>
        <div className="field-search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fields…" />
        </div>
        <div className="field-list">
          {visibleFields.map((h) => (
            <div
              key={h}
              className="field-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', h);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              title="Drag into a zone, or use the buttons"
            >
              <GripVertical size={13} className="grip" />
              <FieldTypeIcon type={types[h]} />
              <span className="field-name">{h}</span>
              <div className="field-add">
                <button title="Add to Rows" onClick={() => addTo('rows', h)}>Row</button>
                <button title="Add to Columns" onClick={() => addTo('columns', h)}>Col</button>
                <button title="Add to Values" onClick={() => addTo('values', h)}>Val</button>
                <button title="Add to Filters" onClick={() => addTo('filters', h)}>Flt</button>
              </div>
            </div>
          ))}
          {!visibleFields.length && <div className="muted pad">No fields match.</div>}
        </div>
      </div>

      {/* ---- zones ---- */}
      <div className="zones">
        <div className="zone-row">
          <DropZone title="Rows" icon={Rows3} onDropField={(f) => addTo('rows', f)} hint="Drag fields here — e.g. Month, Region">
            {config.rows.map((f) => axisChip(f, 'rows'))}
          </DropZone>
          <DropZone title="Columns" icon={Columns3} onDropField={(f) => addTo('columns', f)} hint="Drag fields here — e.g. Product Category">
            {config.columns.map((f) => axisChip(f, 'columns'))}
          </DropZone>
        </div>
        <div className="zone-row">
          <DropZone title="Values" icon={Sigma} onDropField={(f) => addTo('values', f)} hint="Drag numeric fields here — e.g. Revenue">
            {config.values.map((spec) => (
              <div className="chip value-chip" key={spec.id}>
                <FieldTypeIcon type={types[spec.field]} />
                <span className="chip-name">{spec.field}</span>
                <select
                  className="chip-select"
                  value={spec.agg}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      values: config.values.map((v) =>
                        v.id === spec.id ? { ...v, agg: e.target.value } : v
                      ),
                    })
                  }
                  title="Aggregation"
                >
                  {AGGREGATIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
                <button
                  className="chip-x"
                  title="Remove"
                  onClick={() =>
                    onChange({ ...config, values: config.values.filter((v) => v.id !== spec.id) })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </DropZone>
          <DropZone title="Filters" icon={Filter} onDropField={(f) => addTo('filters', f)} hint="Drag fields here to filter — e.g. Channel">
            {Object.keys(config.filters).map((f) => (
              <div className="filter-chip-row" key={f}>
                <FilterEditor
                  field={f}
                  rows={rows}
                  selected={config.filters[f]}
                  onChange={(sel) => onChange({ ...config, filters: { ...config.filters, [f]: sel } })}
                />
                <button className="chip-x standalone" onClick={() => removeField('filters', f)} title="Remove filter">
                  <X size={13} />
                </button>
              </div>
            ))}
          </DropZone>
        </div>

        <div className="totals-row card">
          <span className="totals-label">Totals</span>
          <label className="check">
            <input type="checkbox" checked={config.showRowTotals} onChange={(e) => setTotals({ showRowTotals: e.target.checked })} />
            Row totals
          </label>
          <label className="check">
            <input type="checkbox" checked={config.showColTotals} onChange={(e) => setTotals({ showColTotals: e.target.checked })} />
            Column totals
          </label>
          <label className="check">
            <input type="checkbox" checked={config.showGrandTotal} onChange={(e) => setTotals({ showGrandTotal: e.target.checked })} />
            Grand total
          </label>
        </div>
      </div>
    </div>
  );
}
