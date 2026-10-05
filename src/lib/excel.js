// Excel / CSV parsing with SheetJS (community edition).
// Converts a workbook sheet into { headers, rows } where rows is an
// array of plain objects keyed by header name. Dates are parsed into
// real Date objects (cellDates: true) so downstream type detection works.
import * as XLSX from 'xlsx';

/** Read an uploaded File/Blob into a SheetJS workbook object. */
export async function readWorkbook(file) {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true });
}

/** Sheet names in workbook order. */
export function getSheetNames(workbook) {
  return (workbook.SheetNames || []).slice();
}

/**
 * Extract { headers, rows } from one sheet.
 * - Headers are trimmed; blank headers become "Column N".
 * - Fully-empty rows are dropped.
 * - Empty cells become null (not empty strings).
 */
export function sheetToRecords(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" was not found in the workbook.`);

  const matrix = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  if (!matrix.length) return { headers: [], rows: [] };

  const rawHeaders = matrix[0];
  const headers = rawHeaders.map((h, i) => {
    const t = h === null || h === undefined ? '' : String(h).trim();
    return t === '' ? `Column ${i + 1}` : t;
  });

  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const obj = {};
    let allEmpty = true;
    for (let c = 0; c < headers.length; c++) {
      let v = line[c];
      if (v === '') v = null;
      if (typeof v === 'string') v = v.trim() === '' ? null : v.trim();
      if (typeof v === 'number' && Number.isNaN(v)) v = null;
      if (v !== null && v !== undefined) allEmpty = false;
      obj[headers[c]] = v === undefined ? null : v;
    }
    if (!allEmpty) rows.push(obj);
  }

  return { headers, rows };
}
