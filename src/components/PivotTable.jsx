// Renders the computed pivot as a clean grid: sticky headers, formatted
// numbers, highlighted totals, and helpful empty states.
import { Table2 } from 'lucide-react';
import { valueSpecLabel } from '../lib/pivot';
import { formatPivotValue } from '../lib/format';

export default function PivotTable({ result, config, currency }) {
  if (!result) return null;

  if (result.needsSetup) {
    return (
      <div className="empty-state card">
        <Table2 size={32} />
        <h3>Build your pivot table</h3>
        <p>Add at least one field to <strong>Values</strong> (and usually one to <strong>Rows</strong>) in the designer above.</p>
      </div>
    );
  }

  if (result.empty) {
    return (
      <div className="empty-state card">
        <Table2 size={32} />
        <h3>No data to show</h3>
        <p>No rows match the current filters. Loosen a filter or pick a different sheet.</p>
      </div>
    );
  }

  const { rowFields, colFields, values, rowPaths, colPaths, cells, rowTotals, colTotals, grandTotals } = result;
  const cellAt = (rk, ck, vi) => (cells[rk] && cells[rk][ck] ? cells[rk][ck][vi] : null);
  const fmt = (v, spec) => formatPivotValue(v, spec.field, spec.agg, currency);
  const cornerSpan = colFields.length + 1;

  const cornerCell = (
    <th
      rowSpan={cornerSpan}
      colSpan={Math.max(rowFields.length, 1)}
      className="corner"
    >
      {rowFields.length ? rowFields.join('  /  ') : 'All rows'}
    </th>
  );

  return (
    <div className="card pivot-card">
      <div className="card-head">
        <div>
          <h3>Pivot result</h3>
          <p className="muted">
            {result.rowCount.toLocaleString()} rows aggregated
            {result.rowCount !== result.totalRows && ` (filtered from ${result.totalRows.toLocaleString()})`}
          </p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="pivot-table">
          <thead>
            {colFields.map((cf, level) => (
              <tr key={`level-${level}`}>
                {level === 0 && cornerCell}
                {colPaths.map((cp) => (
                  <th key={cp.key} colSpan={values.length} className="col-group">
                    {cp.parts[level].label}
                  </th>
                ))}
                {config.showRowTotals && (
                  <th rowSpan={cornerSpan} colSpan={values.length} className="total-head">
                    Total
                  </th>
                )}
              </tr>
            ))}
            <tr>
              {colFields.length === 0 && cornerCell}
              {colPaths.map((cp) =>
                values.map((v) => (
                  <th key={`${cp.key}-${v.id}`} className="val-head">
                    {valueSpecLabel(v)}
                  </th>
                ))
              )}
              {config.showRowTotals &&
                values.map((v) => (
                  <th key={`rt-${v.id}`} className="total-head val-head">
                    {valueSpecLabel(v)}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rowPaths.map((rp) => (
              <tr key={rp.key}>
                {rp.parts.map((p, i) => (
                  <th key={i} className="row-head">{p.label}</th>
                ))}
                {colPaths.map((cp) =>
                  values.map((v, vi) => (
                    <td key={`${cp.key}-${v.id}`} className="num">
                      {fmt(cellAt(rp.key, cp.key, vi), v)}
                    </td>
                  ))
                )}
                {config.showRowTotals &&
                  values.map((v, vi) => (
                    <td key={`rt-${v.id}`} className="num total-cell">
                      {fmt((rowTotals[rp.key] || [])[vi], v)}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
          {config.showGrandTotal && (
            <tfoot>
              <tr>
                <th colSpan={Math.max(rowFields.length, 1)} className="row-head total-cell">
                  Grand Total
                </th>
                {config.showColTotals &&
                  colPaths.map((cp) =>
                    values.map((v, vi) => (
                      <td key={`ct-${cp.key}-${v.id}`} className="num total-cell">
                        {fmt((colTotals[cp.key] || [])[vi], v)}
                      </td>
                    ))
                  )}
                {config.showRowTotals &&
                  values.map((v, vi) => (
                    <td key={`gt-${v.id}`} className="num grand-cell">
                      {fmt(grandTotals[vi], v)}
                    </td>
                  ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
