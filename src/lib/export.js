// Export the current pivot result to .xlsx / .csv via SheetJS.
import * as XLSX from 'xlsx';
import { valueSpecLabel } from './pivot';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Flatten the pivot result into a 2D array (like the on-screen grid). */
function pivotToMatrix(result, config) {
  const { rowFields, colFields, values, rowPaths, colPaths, cells, rowTotals, colTotals, grandTotals } = result;
  const matrix = [];

  // Header rows for each column field level.
  colFields.forEach((cf, level) => {
    const row = [];
    if (level === 0) {
      // corner cell label (spans logically, not merged — exports stay simple)
      row.push(rowFields.length ? rowFields.join(' / ') : 'Rows');
    } else {
      for (let i = 0; i < Math.max(rowFields.length, 1); i++) row.push('');
    }
    for (const cp of colPaths) {
      row.push(cp.parts[level].label);
      for (let i = 1; i < values.length; i++) row.push('');
    }
    if (config.showRowTotals) {
      row.push('Total');
      for (let i = 1; i < values.length; i++) row.push('');
    }
    matrix.push(row);
  });

  // Value-label row.
  const valueRow = [];
  for (let i = 0; i < Math.max(rowFields.length, 1); i++) valueRow.push('');
  for (const cp of colPaths) {
    for (const v of values) valueRow.push(valueSpecLabel(v));
  }
  if (config.showRowTotals) {
    for (const v of values) valueRow.push(valueSpecLabel(v));
  }
  matrix.push(valueRow);

  // Data rows.
  for (const rp of rowPaths) {
    const row = rp.parts.map((p) => p.label);
    while (row.length < Math.max(rowFields.length, 1)) row.push('');
    for (const cp of colPaths) {
      const vals = (cells[rp.key] && cells[rp.key][cp.key]) || [];
      for (let i = 0; i < values.length; i++) row.push(vals[i] ?? '');
    }
    if (config.showRowTotals) {
      const t = rowTotals[rp.key] || [];
      for (let i = 0; i < values.length; i++) row.push(t[i] ?? '');
    }
    matrix.push(row);
  }

  // Column totals + grand total row.
  if (config.showColTotals) {
    const row = ['Total'];
    for (let i = 1; i < Math.max(rowFields.length, 1); i++) row.push('');
    for (const cp of colPaths) {
      const t = colTotals[cp.key] || [];
      for (let i = 0; i < values.length; i++) row.push(t[i] ?? '');
    }
    if (config.showRowTotals) {
      for (let i = 0; i < values.length; i++) row.push(grandTotals[i] ?? '');
    }
    matrix.push(row);
  }

  return matrix;
}

export function exportPivot(result, config, kind, baseName = 'finsight-pivot') {
  const matrix = pivotToMatrix(result, config);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pivot');

  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${baseName}-${stamp}.csv`);
  } else {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    triggerDownload(
      new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${baseName}-${stamp}.xlsx`
    );
  }
}
