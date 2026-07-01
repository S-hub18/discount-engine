/**
 * PdfUploader.jsx
 * Dropzone for a single PDF cart file. Calls onLoad(file).
 */

import { useRef } from 'react'

export default function PdfUploader({ label, description, onLoad, hasData, fileName, isBusy = false }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    onLoad(file)
    e.target.value = ''
  }

  const cls = `dropzone${isBusy ? ' dropzone--busy' : hasData ? ' dropzone--ok' : ''}`

  return (
    <div
      className={cls}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFile} />
      <span className="dropzone__icon">{isBusy ? '⏳' : hasData ? '✅' : '📕'}</span>
      <div>
        <div className="dropzone__label">{label}</div>
        <div className="dropzone__hint">
          {hasData ? fileName : isBusy ? 'Extracting rows from PDF…' : description}
        </div>
      </div>
      <span className="dropzone__action">{isBusy ? 'Parsing' : hasData ? 'Change' : 'Upload'}</span>
    </div>
  )
}
