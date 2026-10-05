// Drag & drop Excel/CSV upload with multi-sheet picker.
import { useRef, useState } from 'react';
import {
  CloudUpload, FileSpreadsheet, AlertCircle, Loader2, ChevronRight, X,
} from 'lucide-react';
import { readWorkbook, getSheetNames, sheetToRecords } from '../lib/excel';

export default function FileUpload({ onDataset }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { fileName, workbook, sheets }
  const [error, setError] = useState(null);

  function fail(msg) {
    setError(msg);
    setBusy(false);
  }

  function finish(fileName, sheetName, headers, rows) {
    if (!headers.length) {
      fail(`"${sheetName}" has no readable header row.`);
      return;
    }
    if (!rows.length) {
      fail(`"${sheetName}" contains headers but no data rows.`);
      return;
    }
    setError(null);
    setBusy(false);
    onDataset({ name: `${fileName}  ·  ${sheetName}`, headers, rows });
  }

  async function handleFile(file) {
    setError(null);
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      fail(`"${file.name}" is not supported. Please choose an .xlsx, .xls or .csv file.`);
      return;
    }
    setBusy(true);
    try {
      const wb = await readWorkbook(file);
      const sheets = getSheetNames(wb);
      if (!sheets.length) {
        fail(`No worksheets were found in "${file.name}".`);
        return;
      }
      if (sheets.length === 1) {
        const { headers, rows } = sheetToRecords(wb, sheets[0]);
        finish(file.name, sheets[0], headers, rows);
      } else {
        setPending({ fileName: file.name, workbook: wb, sheets });
        setBusy(false);
      }
    } catch (e) {
      fail(`Could not read "${file.name}": ${e.message}`);
    }
  }

  function pickSheet(name) {
    const { fileName, workbook } = pending;
    setBusy(true);
    try {
      const { headers, rows } = sheetToRecords(workbook, name);
      setPending(null);
      finish(fileName, name, headers, rows);
    } catch (e) {
      fail(`Could not read sheet "${name}": ${e.message}`);
    }
  }

  // --- multi-sheet picker ------------------------------------------------
  if (pending) {
    return (
      <div className="sheet-picker">
        <div className="sheet-picker-head">
          <FileSpreadsheet size={22} />
          <div>
            <h3>Choose a worksheet</h3>
            <p>"{pending.fileName}" contains {pending.sheets.length} sheets.</p>
          </div>
          <button className="icon-btn" onClick={() => setPending(null)} title="Cancel">
            <X size={18} />
          </button>
        </div>
        {busy && (
          <div className="busy-row"><Loader2 size={16} className="spin" /> Reading sheet…</div>
        )}
        <div className="sheet-list">
          {pending.sheets.map((s) => (
            <button key={s} className="sheet-item" onClick={() => pickSheet(s)} disabled={busy}>
              <FileSpreadsheet size={16} />
              <span>{s}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        {error && <div className="error-box"><AlertCircle size={16} /> {error}</div>}
      </div>
    );
  }

  // --- drop zone ----------------------------------------------------------
  return (
    <div>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        <div className="dropzone-icon">
          {busy ? <Loader2 size={36} className="spin" /> : <CloudUpload size={36} />}
        </div>
        <div className="dropzone-title">
          {busy ? 'Reading your file…' : dragging ? 'Drop it here!' : 'Drag & drop your Excel file here'}
        </div>
        <div className="dropzone-sub">or click to browse — .xlsx, .xls, .csv</div>
        <div className="dropzone-note">
          Headers are auto-detected and the pivot table, KPIs and charts configure themselves.
        </div>
      </div>
      {error && <div className="error-box"><AlertCircle size={16} /> {error}</div>}
    </div>
  );
}
