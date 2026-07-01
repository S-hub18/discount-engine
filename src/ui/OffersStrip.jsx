import { ruleValueLabel, ruleScopeLabel } from '../lib/format.js'

/**
 * Shows the currently-active discount rules as a row of offer chips.
 * @param {{ rules: Array<object> }} props
 */
export default function OffersStrip({ rules }) {
  if (!rules || rules.length === 0) {
    return <p style={{ color: '#8d8d8d', fontSize: 14 }}>No active offers yet — load rules.csv or write one in the Rule Studio below.</p>
  }

  return (
    <div className="offers">
      <div className="eyebrow">Active offers</div>
      <div className="offers__row">
        {rules.map((rule) => (
          <div className="offer-chip" key={rule.ruleId}>
            <span className="offer-chip__dot" />
            <strong>{ruleValueLabel(rule)}</strong>
            <span style={{ color: '#8d8d8d' }}>·</span>
            <span>{ruleScopeLabel(rule)}</span>
            {rule.stackable && <span className="badge badge--tag">stackable</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
