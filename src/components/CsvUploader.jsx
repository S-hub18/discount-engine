/**
 * CsvUploader.jsx
 * Renders a dropzone for a single CSV file. Calls onLoad(rawText, fileName).
 */

import { useRef } from 'react'

export default function CsvUploader({ label, description, onLoad, hasData, fileName }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => onLoad(evt.target.result, file.name)
    reader.readAsText(file)
    e.target.value = '' // allow re-uploading the same file
  }

  return (
    <div
      className={`dropzone${hasData ? ' dropzone--ok' : ''}`}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
      <span className="dropzone__icon">{hasData ? '✅' : '📄'}</span>
      <div>
        <div className="dropzone__label">{label}</div>
        <div className="dropzone__hint">{hasData ? fileName : description}</div>
      </div>
      <span className="dropzone__action">{hasData ? 'Change' : 'Upload'}</span>
    </div>
  )
}
