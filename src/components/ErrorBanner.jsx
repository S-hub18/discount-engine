/**
 * ErrorBanner.jsx
 * Displays a list of parse or validation errors.
 */

export default function ErrorBanner({ errors }) {
  if (!errors || errors.length === 0) return null
  return (
    <div className="errors">
      <div className="errors__title">
        {errors.length} issue{errors.length > 1 ? 's' : ''} found
      </div>
      {errors.map((e, i) => (
        <div key={i} className="errors__item">{e}</div>
      ))}
    </div>
  )
}
