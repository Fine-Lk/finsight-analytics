// Scrollable preview of the loaded dataset (first 100 rows) with
// detected type badges on each column header.
import { Hash, CalendarDays, Type } from 'lucide-react';
import { valueLabel } from '../lib/pivot';

const TYPE_META = {
  number: { icon: Hash, label: 'Number', cls: 't-number' },
  date: { icon: CalendarDays, label: 'Date', cls: 't-date' },
  text: { icon: Type, label: 'Text', cls: 't-text' },
};

export default function DataPreview({ headers, rows, types }) {
  const preview = rows.slice(0, 100);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Data preview</h3>
          <p className="muted">
            Showing {preview.length} of {rows.length.toLocaleString()} rows · {headers.length} columns
          </p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="rownum">#</th>
              {headers.map((h) => {
                const meta = TYPE_META[types[h]] || TYPE_META.text;
                const Icon = meta.icon;
                return (
                  <th key={h}>
                    <span className="col-head">
                      {h}
                      <span className={`type-badge ${meta.cls}`} title={`Detected as ${meta.label}`}>
                        <Icon size={11} /> {meta.label}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td className="rownum">{i + 1}</td>
                {headers.map((h) => (
                  <td key={h} className={types[h] === 'number' ? 'num' : ''}>
                    {valueLabel(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
