/**
 * DataTable.jsx
 * Renders a simple table from an array of objects.
 * Columns are defined as [{ key, label, render? }].
 */

export default function DataTable({ columns, rows, emptyMessage = 'No data loaded.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#8d8d8d',
          fontSize: 13,
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)',
        }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
